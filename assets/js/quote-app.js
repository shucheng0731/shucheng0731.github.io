(async function () {
	const dataResponse = await fetch("assets/data/quote-data.json");
	const quoteData = await dataResponse.json();

	const discountResponse = await fetch("assets/data/discount.txt");
	const discountText = await discountResponse.text();
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

	fillSelect(modelSelect, quoteData.models);
	fillSelect(styleSelect, quoteData.styles);
	fillSelect(colorSelect, quoteData.colors, "311");

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

	function updateDimensionPlaceholders() {
		const priceStyle = classifyStyle(styleSelect.value);
		const table = quoteData.priceTables[priceStyle];
		if (!table || !table.widths?.length || !table.heights?.length) {
			widthInput.placeholder = "例如:最小尺寸";
			heightInput.placeholder = "例如:最小尺寸";
			return;
		}

		const minWidth = Math.min(...table.widths);
		const minHeight = Math.min(...table.heights);
		widthInput.placeholder = `例如:最小尺寸 ${minWidth}`;
		heightInput.placeholder = `例如:最小尺寸 ${minHeight}`;
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

	function getBasePrice(style, width, height) {
		const priceStyle = classifyStyle(style);
		const table = quoteData.priceTables[priceStyle];
		if (!table) {
			throw new Error(`找不到窗型 ${style} 對應的報價表`);
		}

		const widthCeil = Math.ceil(width / 10) * 10;
		const heightCeil = Math.ceil(height / 10) * 10;
		const quotedWidth = findCeilValue(widthCeil, table.widths);
		const quotedHeight = findCeilValue(heightCeil, table.heights);

		const notices = [];
		if (quotedWidth !== widthCeil) {
			const mode = quotedWidth < widthCeil ? "最大值" : "最小值";
			notices.push(`寬度超出報價表，已改用${mode} ${quotedWidth} cm`);
		}
		if (quotedHeight !== heightCeil) {
			const mode = quotedHeight < heightCeil ? "最大值" : "最小值";
			notices.push(`高度超出報價表，已改用${mode} ${quotedHeight} cm`);
		}

		const rowIndex = table.heights.indexOf(quotedHeight);
		const columnIndex = table.widths.indexOf(quotedWidth);
		const basePrice = table.values[rowIndex][columnIndex];

		return {
			basePrice,
			priceStyle,
			quotedWidth,
			quotedHeight,
			notices,
		};
	}

	function getHangingRodPrice(model, style, openingHeight) {
		if (openingHeight == null) {
			return 0;
		}

		const styleCounts = quoteData.hangingRodCounts?.[style] || {};
		const baseModel = model.includes("1027") ? "1027" : model.includes("827") ? "827" : model;
		const rawCount = styleCounts[baseModel] || 0;
		if (rawCount <= 0) {
			return 0;
		}

		const freeCount = discounts[getFreeKey(style)] || 0;
		const chargeCount = Math.max(0, rawCount - freeCount);
		if (chargeCount <= 0) {
			return 0;
		}

		const weightKey = baseModel === "1027" ? "1805_Weight_M" : "8805_Weight_M";
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

	function applyAdjustments(basePrice, model, style, color, width, openingHeight, options) {
		let finalPrice = Number(basePrice);
		const adjustments = [];

		if (model.includes("1027")) {
			const factor = discounts.model_1027 ?? 1;
			finalPrice *= factor;
			if (factor !== 1) adjustments.push({ name: `型號 ${model}`, kind: "factor", value: factor });
		}

		if (model.includes("827")) {
			const factor = discounts.model_827 ?? 1;
			finalPrice *= factor;
			if (factor !== 1) adjustments.push({ name: `型號 ${model}`, kind: "factor", value: factor });
		}

		if (model === "1027T") {
			const factor = discounts[getTModelKey(style)] ?? 1;
			finalPrice *= factor;
			if (factor !== 1) adjustments.push({ name: "1027T 窗型補正", kind: "factor", value: factor });
		}

		const colorFactor = color === "311" ? discounts.color_311 ?? 1 : discounts.color_not_311 ?? 1;
		finalPrice *= colorFactor;
		if (colorFactor !== 1) adjustments.push({ name: `顏色 ${color}`, kind: "factor", value: colorFactor });

		if (options.pack) {
			const factor = discounts.pack ?? 1;
			finalPrice *= factor;
			if (factor !== 1) adjustments.push({ name: "包裝", kind: "factor", value: factor });
		}

		if (options.dualWheel) {
			const addPrice = (discounts[getWheelKey(style)] ?? 0) * 50;
			finalPrice += addPrice;
			if (addPrice) adjustments.push({ name: "雙輪加價", kind: "add", value: addPrice });
		}

		if (options.screenMid) {
			const addPrice = (width / 100 / 2) * (discounts.SCREEN_Weight_M ?? 0) * (discounts.price_kg ?? 0);
			finalPrice += addPrice;
			if (addPrice) adjustments.push({ name: "紗中加價", kind: "add", value: addPrice });
		}

		if (options.windowMid) {
			const addPrice = (width / 100) * (discounts.Window_Weight_M ?? 0) * (discounts.price_kg ?? 0);
			finalPrice += addPrice;
			if (addPrice) adjustments.push({ name: "內中加價", kind: "add", value: addPrice });
		}

		const hangingRodPrice = getHangingRodPrice(model, style, openingHeight);
		finalPrice += hangingRodPrice;
		if (hangingRodPrice) adjustments.push({ name: "吊管加價", kind: "add", value: hangingRodPrice });

		const openingAdjustmentPrice = getOpeningAdjustmentPrice(style, openingHeight);
		finalPrice += openingAdjustmentPrice;
		if (openingAdjustmentPrice) {
			adjustments.push({
				name: openingAdjustmentPrice > 0 ? "開天增重加價" : "開天減重調價",
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

		kicker.textContent = "報價完成";
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

		quoteNotice.textContent = result.notices.length ? result.notices.join("；") : "已依條件完成報價";
	}

	function showError(message) {
		quoteError.hidden = false;
		quoteError.textContent = message;
	}

	function clearError() {
		quoteError.hidden = true;
		quoteError.textContent = "";
	}

	function calculateQuote() {
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

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		try {
			calculateQuote();
		} catch (error) {
			showError(error.message || "無法完成報價");
		}
	});

	styleSelect.addEventListener("change", () => {
		updateOpeningHeightVisibility();
		updateDimensionPlaceholders();
	});

	[widthInput, heightInput, openingHeightInput].forEach((input, index, inputs) => {
		input.addEventListener("keydown", (event) => {
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
				form.requestSubmit();
			}
		});
	});

	updateOpeningHeightVisibility();
	updateDimensionPlaceholders();
})();
