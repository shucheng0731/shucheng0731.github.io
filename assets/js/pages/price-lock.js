(async function () {
	const STORAGE_KEY = "price_page_unlocked";
	const DISCOUNT_PATH = "../../assets/data/discount.txt";
	const body = document.body;
	const overlay = document.getElementById("priceLock");
	const form = document.getElementById("priceLockForm");
	const input = document.getElementById("pricePassword");
	const error = document.getElementById("priceLockError");
	let password = "";

	function parsePassword(text) {
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
				continue;
			}

			const [key, value] = trimmed.split("=", 2).map((item) => item.trim());
			if (key === "page_password") {
				return value;
			}
		}
		return "";
	}

	function unlockPage() {
		sessionStorage.setItem(STORAGE_KEY, "true");
		overlay.hidden = true;
		body.classList.remove("price-locked");
	}

	if (sessionStorage.getItem(STORAGE_KEY) === "true") {
		unlockPage();
		return;
	}

	try {
		const response = await fetch(DISCOUNT_PATH, { cache: "no-store" });
		const discountText = await response.text();
		password = parsePassword(discountText);
	} catch (fetchError) {
		error.textContent = "無法讀取密碼設定，請稍後再試。";
		return;
	}

	if (!password) {
		error.textContent = "尚未設定價格頁密碼。";
		return;
	}

	form.addEventListener("submit", function (event) {
		event.preventDefault();
		if (input.value === password) {
			error.textContent = "";
			unlockPage();
			return;
		}
		error.textContent = "密碼錯誤，請重新輸入。";
		input.select();
	});

	window.addEventListener("load", function () {
		input.focus();
	});
})();
