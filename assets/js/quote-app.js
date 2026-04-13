(async function () {
	const assetDataBase = new URL("../data/", document.currentScript.src);

	const [models, styles, colors, priceText, discountText] = await Promise.all([
		fetchJson("models.json"),
		fetchJson("style-options.json"),
		fetchJson("colors.json"),
		fetchText("price.txt"),
		fetchText("discount.txt"),
	]);

	const priceConfig = parsePriceText(priceText);
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
	const outerTopMaterialInput = document.getElementById("outerTopMaterial");
	const outerTopMaterialOption = document.getElementById("outerTopMaterialOption");
	const outerFixedMaterialInput = document.getElementById("outerFixedMaterial");
	const outerFixedMaterialOption = document.getElementById("outerFixedMaterialOption");
	const packInput = document.getElementById("pack");
	const quoteError = document.getElementById("quoteError");
	const quoteResult = document.getElementById("quoteResult");
	const adjustmentList = document.getElementById("adjustmentList");
	const quoteNotice = document.getElementById("quoteNotice");

	fillSelect(modelSelect, models);
	fillSelect(styleSelect, styles);
	fillSelect(colorSelect, colors, "311");

	updateStyleDependentFields();
	updateDimensionPlaceholders();

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		await safeCalculateQuote();
	});

	styleSelect.addEventListener("change", async () => {
		updateStyleDependentFields();
		updateDimensionPlaceholders();
		await safeCalculateQuote();
	});

	modelSelect.addEventListener("change", async () => {
		updateStyleDependentFields();
		await safeCalculateQuote();
	});

	[
		colorSelect,
		dualWheelInput,
		screenMidInput,
		windowMidInput,
		outerTopMaterialInput,
		outerFixedMaterialInput,
		packInput,
	].forEach((input) => {
		input.addEventListener("change", async () => {
			await safeCalculateQuote();
		});
	});

	[widthInput, heightInput, openingHeightInput].forEach((input) => {
		input.addEventListener("input", async () => {
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
			throw new Error(`無法讀取資料檔：${filename}`);
		}
		return response.json();
	}

	async function fetchText(filename) {
		const response = await fetch(new URL(filename, assetDataBase), { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`無法讀取資料檔：${filename}`);
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

	function parsePriceText(text) {
		const raw = {};

		text.split(/\r?\n/).forEach((line) => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
				return;
			}

			const [fullKey, rawValue] = trimmed.split("=", 2).map((item) => item.trim());
			const match = fullKey.match(/^(.*)_(W|H|W_10cm|H_10cm|price)$/);
			if (!match) {
				return;
			}

			const style = match[1];
			const field = match[2];
			const number = Number(rawValue);
			if (Number.isNaN(number)) {
				return;
			}

			raw[style] ||= {};
			raw[style][field] = number;
		});

		const result = {};
		Object.entries(raw).forEach(([style, config]) => {
			if (
				typeof config.W !== "number" ||
				typeof config.H !== "number" ||
				typeof config.W_10cm !== "number" ||
				typeof config.H_10cm !== "number" ||
				typeof config.price !== "number"
			) {
				return;
			}

			result[style] = {
				style,
				baseWidth: config.W,
				baseHeight: config.H,
				widthStepPrice: config.W_10cm,
				heightStepPrice: config.H_10cm,
				basePrice: config.price,
			};
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

	function getStyleSeries(style) {
		if (style.includes("6D")) return "6D";
		if (style.includes("4D")) return "4D";
		if (style.includes("3D")) return "3D";
		return "2D";
	}

	function getPriceConfig(style) {
		const priceStyle = classifyStyle(style);
		const config = priceConfig[priceStyle];
		if (!config) {
			throw new Error(`找不到 ${priceStyle} 的牌價設定`);
		}
		return config;
	}

	function parseDimension(value, label) {
		if (!value.trim()) {
			throw new Error(`請輸入${label}`);
		}

		const number = Number(value);
		if (Number.isNaN(number)) {
			throw new Error(`${label}必須是數字`);
		}

		if (number <= 0) {
			throw new Error(`${label}必須大於 0`);
		}

		return number;
	}

	function getWheelKey(style) {
		return `Wheel_${getStyleSeries(style)}`;
	}

	function getTModelKey(style) {
		return `model_T_${getStyleSeries(style)}`;
	}

	function getOpeningAdjustmentKey(style) {
		return `20_${getStyleSeries(style)}`;
	}

	function getFreeKey(style) {
		return `free_${getStyleSeries(style)}`;
	}

	function styleRequiresOpeningHeight(style) {
		return style.includes("F");
	}

	function styleHasF(style) {
		return style.includes("F");
	}

	function styleHasLeadingF(style) {
		const firstSegment = style.split("_", 1)[0];
		return firstSegment.includes("F");
	}

	function styleHasTrailingOrNoF(style) {
		return !styleHasF(style) || !styleHasLeadingF(style);
	}

	function updateDimensionPlaceholders() {
		const config = getPriceConfig(styleSelect.value);
		widthInput.placeholder = `建議起始寬度 ${config.baseWidth}`;
		heightInput.placeholder = `建議起始高度 ${config.baseHeight}`;
	}

	function updateStyleDependentFields() {
		const style = styleSelect.value;
		const model = modelSelect.value;
		const supportsMaterialOptions = model === "1027S" || model === "1027T";

		if (styleRequiresOpeningHeight(style)) {
			openingHeightRow.classList.remove("quote-row-hidden");
		} else {
			openingHeightInput.value = "";
			openingHeightRow.classList.add("quote-row-hidden");
		}

		if (supportsMaterialOptions && styleHasTrailingOrNoF(style)) {
			outerTopMaterialOption.hidden = false;
		} else {
			outerTopMaterialInput.checked = false;
			outerTopMaterialOption.hidden = true;
		}

		if (supportsMaterialOptions && styleHasF(style)) {
			outerFixedMaterialOption.hidden = false;
		} else {
			outerFixedMaterialInput.checked = false;
			outerFixedMaterialOption.hidden = true;
		}
	}

	function getBasePrice(style, width, height) {
		const config = getPriceConfig(style);
		const widthCeil = Math.ceil(width / 10) * 10;
		const heightCeil = Math.ceil(height / 10) * 10;
		const quotedWidth = Math.max(widthCeil, config.baseWidth);
		const quotedHeight = Math.max(heightCeil, config.baseHeight);
		const widthSteps = Math.round((quotedWidth - config.baseWidth) / 10);
		const heightSteps = Math.round((quotedHeight - config.baseHeight) / 10);
		const notices = [];

		if (quotedWidth !== width) {
			notices.push(`寬度已無條件進位至 ${quotedWidth} cm 計算`);
		}
		if (quotedHeight !== height) {
			notices.push(`高度已無條件進位至 ${quotedHeight} cm 計算`);
		}
		if (widthCeil < config.baseWidth) {
			notices.push(`寬度低於起始寬度，仍以 ${config.baseWidth} cm 起算`);
		}
		if (heightCeil < config.baseHeight) {
			notices.push(`高度低於起始高度，仍以 ${config.baseHeight} cm 起算`);
		}

		const basePrice =
			config.basePrice +
			(widthSteps * config.widthStepPrice) +
			(heightSteps * config.heightStepPrice);

		return {
			basePrice,
			priceStyle: config.style,
			quotedWidth,
			quotedHeight,
			notices,
		};
	}

	function getHangingPipeCount(style) {
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

	function getHangingPipeWeightKey(model) {
		if (model.includes("1027")) {
			return "1805_Weight_M";
		}

		if (model.includes("827")) {
			return "8805_Weight_M";
		}

		return "";
	}

	function getHangingPipePrice(model, style, openingHeight) {
		if (openingHeight == null) {
			return 0;
		}

		const rawCount = getHangingPipeCount(style);
		if (rawCount <= 0) {
			return 0;
		}

		const freeCount = discounts[getFreeKey(style)] || 0;
		const chargeCount = Math.max(0, rawCount - freeCount);
		if (chargeCount <= 0) {
			return 0;
		}

		const weightKey = getHangingPipeWeightKey(model);
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

	function getMaterialUpgradePrice(width, weightKey) {
		const roundedWidth = Math.ceil(width / 50) * 50;
		const weightPer50 = discounts[weightKey] || 0;
		const priceKg = discounts.price_kg || 0;
		return roundedWidth * (weightPer50 / 50) * priceKg;
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
				adjustments.push({ name: "內框加大", kind: "factor", value: factor });
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

		if (options.outerTopMaterial) {
			const addPrice = getMaterialUpgradePrice(width, "1310C");
			finalPrice += addPrice;
			if (addPrice) {
				adjustments.push({ name: "外上換中腰", kind: "add", value: addPrice });
			}
		}

		if (options.outerFixedMaterial) {
			const addPrice = getMaterialUpgradePrice(width, "1206B");
			finalPrice += addPrice;
			if (addPrice) {
				adjustments.push({ name: "換5cm固定", kind: "add", value: addPrice });
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

		const hangingPipePrice = getHangingPipePrice(model, style, openingHeight);
		finalPrice += hangingPipePrice;
		if (hangingPipePrice) {
			adjustments.push({ name: "吊管加價", kind: "add", value: hangingPipePrice });
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
			item.textContent = "無額外調整";
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
			: "已依目前牌價與折數完成試算。";
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
			showError(error.message || "試算失敗，請稍後再試。");
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
			outerTopMaterial: outerTopMaterialInput.checked,
			outerFixedMaterial: outerFixedMaterialInput.checked,
			pack: packInput.checked,
		};

		const base = getBasePrice(style, width, height);
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
