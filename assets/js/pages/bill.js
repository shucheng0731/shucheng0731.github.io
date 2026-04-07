const netInput = document.getElementById("net");
const grossInput = document.getElementById("gross");
const taxOutput = document.getElementById("tax");
const chineseAmount = document.getElementById("chineseAmount");

const TAX_RATE = 0.05;

function numberToChinese(n) {
	if (!n || n <= 0) return "零元整";
	const fraction = ["角", "分"];
	const digit = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];
	const unit = [["元", "萬", "億"], ["", "拾", "佰", "仟"]];
	let head = n < 0 ? "負" : "";
	n = Math.abs(n);

	let s = "";
	for (let i = 0; i < fraction.length; i++) {
		s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, "");
	}
	s = s || "整";
	n = Math.floor(n);

	for (let i = 0; i < unit[0].length && n > 0; i++) {
		let p = "";
		for (let j = 0; j < unit[1].length && n > 0; j++) {
			p = digit[n % 10] + unit[1][j] + p;
			n = Math.floor(n / 10);
		}
		s = p.replace(/(零.)*零$/, "").replace(/^$/, "零") + unit[0][i] + s;
	}

	return head + s.replace(/(零.)*零元/, "元").replace(/(零.)+/g, "零").replace(/^整$/, "零元整");
}

function calculateFromNet() {
	let net = parseFloat(netInput.value);
	if (isNaN(net)) return;
	let tax = Math.round(net * TAX_RATE);
	let gross = net + tax;
	taxOutput.textContent = tax;
	grossInput.value = gross;
	chineseAmount.textContent = numberToChinese(gross);
}

function calculateFromGross() {
	let gross = parseFloat(grossInput.value);
	if (isNaN(gross)) return;
	let net = Math.round(gross / (1 + TAX_RATE));
	let tax = gross - net;
	netInput.value = net;
	taxOutput.textContent = tax;
	chineseAmount.textContent = numberToChinese(gross);
}

netInput.addEventListener("input", calculateFromNet);
grossInput.addEventListener("input", calculateFromGross);
