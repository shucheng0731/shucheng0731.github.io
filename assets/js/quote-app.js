(async function () {
	const assetDataBase = new URL("../data/", document.currentScript.src);
	const styleCache = new Map();

	const [
		models,
		styles,
		colors,
		discountText,
	] = await Promise.all([
		fetchJson("models.json"),
		fetchJson("style-options.json"),
		fetchJson("colors.json"),
		fetchText("discount.txt"),
	]);

	const discounts = parseDiscountText(discountText);

	const form = document.getElementById("quoteForm");
	const modelSelect = document.getElementById("model");
	const styleSelect = document.getElementById("style");
	const colorSelect = document.getElementById("color");
	const widthInput = document.getElementById("width");
	const heightInput = document.getElementById("height");
	const openingHeightInput = document.getElementById("openingHeight");
	const openingHeightRow = document.getElementById("openingHeightRow");
	const dualWheelInput = document.getElementById("dualWheel");
	const screenMidInput = document.getElementById("screenMid");
	const windowMidInput = document.getElementById("windowMid");
	const packInput = document.getElementById("pack");
	const quoteError = document.getElementById("quoteError");
	const quoteResult = document.getElementById("quoteResult");
	const adjustmentList = document.getElementById("adjustmentList");
	const quoteNotice = document.getElementById("quoteNotice");

	fillSelect(modelSelect, models);
	fillSelect(styleSelect, styles);
	fillSelect(colorSelect, colors, "311");

	updateOpeningHeightVisibility();
	await updateDimensionPlaceholders();

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		await safeCalculateQuote();
	});

	styleSelect.addEventListener("change", async () => {
		updateOpeningHeightVisibility();
		await updateDimensionPlaceholders();
		await safeCalculateQuote();
	});

	[modelSelect, colorSelect, dualWheelInput, screenMidInput, windowMidInput, packInput].forEach((input) => {
		input.addEventListener("change", async () => {
			await safeCalculateQuote();
		});
	});

	[widthInput, heightInput, openingHeightInput].forEach((input) => {
		input.addEventListener("input", async () => {
			await safeCalculateQuote();
		});
		input.addEventListener("change", async () => {
			await safeCalculateQuote();
		});
		input.addEventListener("blur", async () => {
			await safeCalculateQuote();
		});
		input.addEventListener("focus", () => {
			input.select();
		});
	});

	[widthInput, heightInput, openingHeightInput].forEach((input, index, inputs) => {
		input.addEventListener("keydown", async (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();

			if (input === widthInput) {
				heightInput.focus();
				heightInput.select();
				return;
			}

			if (input === heightInput && styleRequiresOpeningHeight(styleSelect.value)) {
				openingHeightInput.focus();
				openingHeightInput.select();
				return;
			}

			if (index === inputs.length - 1 || (input === heightInput && !styleRequiresOpeningHeight(styleSelect.value))) {
				await safeCalculateQuote();
			}
		});
	});

	async function fetchJson(filename) {
		const response = await fetch(new URL(filename, assetDataBase), { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`無法讀取資料：${filename}`);
		}
		return response.json();
	}

	async function fetchText(filename) {
		const response = await fetch(new URL(filename, assetDataBase), { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`無法讀取資料：${filename}`);
		}
		return response.text();
	}

	function parseDiscountText(text) {
		const result = {};
		text.split(/\r?\n/).forEach((line) => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
				return;
			}

			const [key, value] = trimmed.split("=", 2).map((item) => item.trim());
			const number = Number(value);
			if (!Number.isNaN(number)) {
				result[key] = number;
			}
		});
		return result;
	}

	function fillSelect(select, values, preferredValue) {
		select.innerHTML = "";
		values.forEach((value) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = value;
			select.appendChild(option);
		});

		if (preferredValue && values.includes(preferredValue)) {
			select.value = preferredValue;
		}
	}

	function classifyStyle(style) {
		if (style.includes("F") && style.includes("2D")) return "F_2D";
		if (style.includes("F") && style.includes("3D")) return "F_3D";
		if (style.includes("F") && style.includes("4D")) return "F_4D";
		if (style.includes("F") && style.includes("6D")) return "F_6D";
		return style;
	}

	async function getPriceTable(style) {
		const priceStyle = classifyStyle(style);
		if (styleCache.has(priceStyle)) {
			return styleCache.get(priceStyle);
		}

		const table = await fetchJson(`styles/${priceStyle}.json`);
		styleCache.set(priceStyle, table);
		return table;
	}

	function parseDimension(value, label) {
		if (!value.trim()) {
			throw new Error(`Please enter ${label}`);
		}

		const number = Number(value);
		if (Number.isNaN(number)) {
			throw new Error(`${label} must be a number`);
		}

		if (number <= 0) {
			throw new Error(`${label} must be greater than 0`);
		}

		return number;
	}

	function getWheelKey(style) {
		if (style.includes("6D")) return "Wheel_6D";
		if (style.includes("4D")) return "Wheel_4D";
		if (style.includes("3D")) return "Wheel_3D";
		return "Wheel_2D";
	}

	function getTModelKey(style) {
		if (style.includes("6D")) return "model_T_6D";
		if (style.includes("4D")) return "model_T_4D";
		if (style.includes("3D")) return "model_T_3D";
		return "model_T_2D";
	}

	function getOpeningAdjustmentKey(style) {
		if (style.includes("6D")) return "20_6D";
		if (style.includes("4D")) return "20_4D";
		if (style.includes("3D")) return "20_3D";
		return "20_2D";
	}

	function getFreeKey(style) {
		if (style.includes("6D")) return "free_6D";
		if (style.includes("4D")) return "free_4D";
		if (style.includes("3D")) return "free_3D";
		return "free_2D";
	}

	function styleRequiresOpeningHeight(style) {
		return style.includes("F");
	}

	async function updateDimensionPlaceholders() {
		const table = await getPriceTable(styleSelect.value);
		if (!table || !table.widths?.length || !table.heights?.length) {
			widthInput.placeholder = "例如：最小尺寸";
			heightInput.placeholder = "例如：最小尺寸";
			return;
		}

		const minWidth = Math.min(...table.widths);
		const minHeight = Math.min(...table.heights);
		widthInput.placeholder = `例如：最小尺寸 ${minWidth}`;
		heightInput.placeholder = `例如：最小尺寸 ${minHeight}`;
	}

	function updateOpeningHeightVisibility() {
		if (styleRequiresOpeningHeight(styleSelect.value)) {
			openingHeightRow.classList.remove("quote-row-hidden");
		} else {
			openingHeightInput.value = "";
			openingHeightRow.classList.add("quote-row-hidden");
		}
	}

	function findCeilValue(value, values) {
		const sorted = [...values].sort((a, b) => a - b);
		if (value <= sorted[0]) return sorted[0];
		if (value >= sorted[sorted.length - 1]) return sorted[sorted.length - 1];
		return sorted.find((item) => item >= value);
	}

	async function getBasePrice(style, width, height) {
		const table = await getPriceTable(style);
		const priceStyle = table.style;

		const widthCeil = Math.ceil(width / 10) * 10;
		const heightCeil = Math.ceil(height / 10) * 10;
		const quotedWidth = findCeilValue(widthCeil, table.widths);
		const quotedHeight = findCeilValue(heightCeil, table.heights);

		const notices = [];
		if (quotedWidth !== widthCeil) {
			notices.push(`寬度超出牌價表範圍，改以 ${quotedWidth} cm 計算`);
		}
		if (quotedHeight !== heightCeil) {
			notices.push(`高度超出牌價表範圍，改以 ${quotedHeight} cm 計算`);
		}

		const rowIndex = table.heights.indexOf(quotedHeight);
		const columnIndex = table.widths.indexOf(quotedWidth);
		const basePrice = table.values[rowIndex]?.[columnIndex];

		if (typeof basePrice !== "number") {
			throw new Error(`找不到 ${priceStyle} 對應尺寸的牌價`);
		}

		return {
			basePrice,
			priceStyle,
			quotedWidth,
			quotedHeight,
			notices,
		};
	}

	function getHangingRodCount(style) {
		const match = style.match(/(\d)F/);
		if (!match) {
			return 0;
		}

		const rawCount = Number(match[1]);
		if (Number.isNaN(rawCount) || rawCount <= 0) {
			return 0;
		}

		return Math.max(0, rawCount - 1);
	}

	function getHangingRodWeightKey(model) {
		if (model.includes("1027")) {
			return "1805_Weight_M";
		}

		if (model.includes("827")) {
			return "8805_Weight_M";
		}

		return "";
	}

	function getHangingRodPrice(model, style, openingHeight) {
		if (openingHeight == null) {
			return 0;
		}

		const rawCount = getHangingRodCount(style);
		if (rawCount <= 0) {
			return 0;
		}

		const freeCount = discounts[getFreeKey(style)] || 0;
		const chargeCount = Math.max(0, rawCount - freeCount);
		if (chargeCount <= 0) {
			return 0;
		}

		const weightKey = getHangingRodWeightKey(model);
		if (!weightKey) {
			return 0;
		}

		const partWeight = discounts[weightKey] || 0;
		const priceKg = discounts.price_kg || 0;
		return (openingHeight / 100) * chargeCount * partWeight * priceKg;
	}

	function getOpeningAdjustmentPrice(style, openingHeight) {
		if (openingHeight == null || !style.includes("F")) {
			return 0;
		}

		const level = Math.floor(Math.abs(openingHeight - 40) / 20);
		if (level <= 0) {
			return 0;
		}

		const adjustmentWeight = discounts[getOpeningAdjustmentKey(style)] || 0;
		const priceKg = discounts.price_kg || 0;
		const price = level * adjustmentWeight * priceKg;
		return openingHeight < 40 ? price : -price;
	}

	function getSModelPrice(width) {
		const roundedWidth = Math.ceil(width / 50) * 50;
		const sWeightPer50 = discounts["1027S"] || 0;
		const priceKg = discounts.price_kg || 0;
		return roundedWidth * (sWeightPer50 / 50) * priceKg;
	}

	function applyAdjustments(basePrice, model, style, color, width, openingHeight, options) {
		let finalPrice = Number(basePrice);
		const adjustments = [];

		if (model.includes("1027")) {
			const factor = discounts.model_1027 ?? 1;
			finalPrice *= factor;
			if (factor !== 1) {
				adjustments.push({ name: `${model} 牌折`, kind: "factor", value: factor });
			}
		}

		if (model.includes("827")) {
			const factor = discounts.model_827 ?? 1;
			finalPrice *= factor;
			if (factor !== 1) {
				adjustments.push({ name: `${model} 牌折`, kind: "factor", value: factor });
			}
		}

		if (model === "1027T") {
			const factor = discounts[getTModelKey(style)] ?? 1;
			finalPrice *= factor;
			if (factor !== 1) {
				adjustments.push({ name: "1027T T窗加成", kind: "factor", value: factor });
			}
		}

		const colorFactor = color === "311" ? discounts.color_311 ?? 1 : discounts.color_not_311 ?? 1;
		finalPrice *= colorFactor;
		if (colorFactor !== 1) {
			adjustments.push({ name: `顏色 ${color}`, kind: "factor", value: colorFactor });
		}

		if (options.pack) {
			const factor = discounts.pack ?? 1;
			finalPrice *= factor;
			if (factor !== 1) {
				adjustments.push({ name: "包裝", kind: "factor", value: factor });
			}
		}

		if (model === "1027S") {
			const addPrice = getSModelPrice(width);
			finalPrice += addPrice;
			if (addPrice) {
				adjustments.push({ name: "1027S S型材料", kind: "add", value: addPrice });
			}
		}

		if (options.dualWheel) {
			const addPrice = (discounts[getWheelKey(style)] ?? 0) * 50;
			finalPrice += addPrice;
			if (addPrice) {
				adjustments.push({ name: "雙輪", kind: "add", value: addPrice });
			}
		}

		if (options.screenMid) {
			const addPrice = (width / 100 / 2) * (discounts.SCREEN_Weight_M ?? 0) * (discounts.price_kg ?? 0);
			finalPrice += addPrice;
			if (addPrice) {
				adjustments.push({ name: "紗中", kind: "add", value: addPrice });
			}
		}

		if (options.windowMid) {
			const addPrice = (width / 100) * (discounts.Window_Weight_M ?? 0) * (discounts.price_kg ?? 0);
			finalPrice += addPrice;
			if (addPrice) {
				adjustments.push({ name: "內中", kind: "add", value: addPrice });
			}
		}

		const hangingRodPrice = getHangingRodPrice(model, style, openingHeight);
		finalPrice += hangingRodPrice;
		if (hangingRodPrice) {
			adjustments.push({ name: "吊管加價", kind: "add", value: hangingRodPrice });
		}

		const openingAdjustmentPrice = getOpeningAdjustmentPrice(style, openingHeight);
		finalPrice += openingAdjustmentPrice;
		if (openingAdjustmentPrice) {
			adjustments.push({
				name: openingAdjustmentPrice > 0 ? "開天高度加價" : "開天高度減價",
				kind: "add",
				value: openingAdjustmentPrice,
			});
		}

		return {
			finalPrice: Math.round(finalPrice),
			adjustments,
		};
	}

	function renderResult(result) {
		const [kicker, title, summary] = quoteResult.querySelectorAll(".quote-result-main > *");
		const factValues = quoteResult.querySelectorAll(".quote-facts dd");

		kicker.textContent = "試算結果";
		title.textContent = `${result.model} / ${result.style} / ${result.color}`;
		summary.textContent = result.openingHeight != null
			? `尺寸 ${result.quotedWidth} x ${result.quotedHeight} cm，開天高度 ${result.openingHeight.toFixed(1)} cm`
			: `尺寸 ${result.quotedWidth} x ${result.quotedHeight} cm`;

		factValues[0].textContent = `NT$ ${result.basePrice.toLocaleString("zh-TW")}`;
		factValues[1].textContent = `NT$ ${result.price.toLocaleString("zh-TW")}`;
		factValues[2].textContent = result.priceStyle;
		factValues[3].textContent = `${result.quotedWidth} x ${result.quotedHeight} cm`;

		adjustmentList.innerHTML = "";
		if (result.adjustments.length === 0) {
			const item = document.createElement("li");
			item.textContent = "無";
			adjustmentList.appendChild(item);
		} else {
			result.adjustments.forEach((adjustment) => {
				const item = document.createElement("li");
				item.textContent = adjustment.kind === "add"
					? `${adjustment.name} + NT$ ${Math.round(adjustment.value).toLocaleString("zh-TW")}`
					: `${adjustment.name} x ${adjustment.value.toFixed(2)}`;
				adjustmentList.appendChild(item);
			});
		}

		quoteNotice.textContent = result.notices.length
			? result.notices.join("；")
			: "已依目前牌價與折數完成試算";
	}

	function showError(message) {
		quoteError.hidden = false;
		quoteError.textContent = message;
	}

	function clearError() {
		quoteError.hidden = true;
		quoteError.textContent = "";
	}

	async function safeCalculateQuote() {
		const style = styleSelect.value;
		const needsOpeningHeight = styleRequiresOpeningHeight(style);
		if (!widthInput.value.trim() || !heightInput.value.trim()) {
			clearError();
			return;
		}
		if (needsOpeningHeight && !openingHeightInput.value.trim()) {
			clearError();
			return;
		}

		try {
			await calculateQuote();
		} catch (error) {
			showError(error.message || "報價試算失敗");
		}
	}

	async function calculateQuote() {
		clearError();

		const model = modelSelect.value;
		const style = styleSelect.value;
		const color = colorSelect.value;
		const width = parseDimension(widthInput.value, "寬度");
		const height = parseDimension(heightInput.value, "高度");
		const openingHeight = styleRequiresOpeningHeight(style)
			? parseDimension(openingHeightInput.value, "開天高度")
			: null;

		const options = {
			dualWheel: dualWheelInput.checked,
			screenMid: screenMidInput.checked,
			windowMid: windowMidInput.checked,
			pack: packInput.checked,
		};

		const base = await getBasePrice(style, width, height);
		const adjusted = applyAdjustments(base.basePrice, model, style, color, width, openingHeight, options);

		renderResult({
			model,
			style,
			color,
			priceStyle: base.priceStyle,
			basePrice: Math.round(base.basePrice),
			price: adjusted.finalPrice,
			quotedWidth: base.quotedWidth,
			quotedHeight: base.quotedHeight,
			openingHeight,
			adjustments: adjusted.adjustments,
			notices: base.notices,
		});
	}
})();
