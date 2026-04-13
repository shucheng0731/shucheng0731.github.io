const netInput = document.getElementById("net");
const grossInput = document.getElementById("gross");
const taxOutput = document.getElementById("tax");
const amountDisplay = document.getElementById("chineseAmount");
const amountCells = Array.from(amountDisplay.querySelectorAll(".amount-cell"));

const TAX_RATE = 0.05;
const MAX_DIGITS = amountCells.length;
const CHINESE_DIGITS = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];

function sanitizeAmount(value) {
	if (!Number.isFinite(value) || value < 0) {
		return 0;
	}

	return Math.floor(value);
}

function setAmountDisplay(amount) {
	const safeAmount = sanitizeAmount(amount);
	const digits = String(safeAmount).slice(0, MAX_DIGITS).padStart(MAX_DIGITS, "0");
	let firstVisibleIndex = digits.search(/[1-9]/);

	if (firstVisibleIndex === -1) {
		firstVisibleIndex = MAX_DIGITS - 1;
	}

	amountCells.forEach((cell, index) => {
		const digitElement = cell.querySelector(".amount-digit");
		const isLeadingBlank = index < firstVisibleIndex;
		const digit = digits[index];

		cell.classList.toggle("amount-cell-empty", isLeadingBlank);
		cell.classList.toggle("amount-cell-zero", !isLeadingBlank && digit === "0");
		cell.classList.toggle("amount-cell-filled", !isLeadingBlank && digit !== "0");
		digitElement.textContent = isLeadingBlank ? "" : CHINESE_DIGITS[Number(digit)];
	});

	amountDisplay.setAttribute("aria-label", `gross amount ${safeAmount}`);
}

function clearFromNet() {
	taxOutput.textContent = "0";
	grossInput.value = "";
	setAmountDisplay(0);
}

function clearFromGross() {
	netInput.value = "";
	taxOutput.textContent = "0";
	setAmountDisplay(0);
}

function calculateFromNet() {
	const net = parseFloat(netInput.value);

	if (Number.isNaN(net)) {
		clearFromNet();
		return;
	}

	const safeNet = sanitizeAmount(net);
	const tax = Math.round(safeNet * TAX_RATE);
	const gross = safeNet + tax;

	netInput.value = safeNet ? String(safeNet) : "";
	taxOutput.textContent = String(tax);
	grossInput.value = String(gross);
	setAmountDisplay(gross);
}

function calculateFromGross() {
	const gross = parseFloat(grossInput.value);

	if (Number.isNaN(gross)) {
		clearFromGross();
		return;
	}

	const safeGross = sanitizeAmount(gross);
	const net = Math.round(safeGross / (1 + TAX_RATE));
	const tax = safeGross - net;

	grossInput.value = safeGross ? String(safeGross) : "";
	netInput.value = String(net);
	taxOutput.textContent = String(tax);
	setAmountDisplay(safeGross);
}

netInput.addEventListener("input", calculateFromNet);
grossInput.addEventListener("input", calculateFromGross);

setAmountDisplay(0);
