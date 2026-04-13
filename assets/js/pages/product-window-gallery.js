const productWindowGallery = document.getElementById("productWindowGallery");
const productWindowImages = Array.from(document.querySelectorAll(".product-window-gallery-image"));
const productWindowModal = document.getElementById("productWindowModal");
const productWindowModalImage = document.getElementById("productWindowModalImage");
const productWindowModalCaption = document.getElementById("productWindowModalCaption");
const productWindowModalClose = document.getElementById("productWindowModalClose");
const productWindowModalPrev = document.getElementById("productWindowModalPrev");
const productWindowModalNext = document.getElementById("productWindowModalNext");

let productWindowCurrentIndex = 0;
let isPointerDown = false;
let dragStartX = 0;
let dragStartScrollLeft = 0;
let dragDistance = 0;
let pendingImageIndex = -1;

function updateProductWindowModal(index) {
	const image = productWindowImages[index];
	if (!image) {
		return;
	}

	productWindowCurrentIndex = index;
	productWindowModalImage.src = image.src;
	productWindowModalImage.alt = image.alt;
	productWindowModalCaption.textContent = image.alt;
}

function openProductWindowModal(index) {
	updateProductWindowModal(index);
	productWindowModal.hidden = false;
	document.body.classList.add("product-window-modal-open");
}

function closeProductWindowModal() {
	productWindowModal.hidden = true;
	document.body.classList.remove("product-window-modal-open");
	productWindowModalImage.src = "";
}

function showProductWindowPrevious() {
	const nextIndex = (productWindowCurrentIndex - 1 + productWindowImages.length) % productWindowImages.length;
	updateProductWindowModal(nextIndex);
}

function showProductWindowNext() {
	const nextIndex = (productWindowCurrentIndex + 1) % productWindowImages.length;
	updateProductWindowModal(nextIndex);
}

productWindowGallery.addEventListener("pointerdown", function (event) {
	const targetImage = event.target.closest(".product-window-gallery-image");
	isPointerDown = true;
	dragStartX = event.clientX;
	dragStartScrollLeft = productWindowGallery.scrollLeft;
	dragDistance = 0;
	pendingImageIndex = targetImage ? productWindowImages.indexOf(targetImage) : -1;
	productWindowGallery.classList.add("is-dragging");
	productWindowGallery.setPointerCapture(event.pointerId);
});

productWindowGallery.addEventListener("pointermove", function (event) {
	if (!isPointerDown) {
		return;
	}

	dragDistance = event.clientX - dragStartX;
	productWindowGallery.scrollLeft = dragStartScrollLeft - dragDistance;
});

function endGalleryDrag(event) {
	if (!isPointerDown) {
		return;
	}

	isPointerDown = false;
	productWindowGallery.classList.remove("is-dragging");
	if (Math.abs(dragDistance) <= 6 && pendingImageIndex >= 0) {
		openProductWindowModal(pendingImageIndex);
	}
	dragDistance = 0;
	pendingImageIndex = -1;

	if (event && typeof event.pointerId === "number" && productWindowGallery.hasPointerCapture(event.pointerId)) {
		productWindowGallery.releasePointerCapture(event.pointerId);
	}
}

productWindowGallery.addEventListener("pointerup", endGalleryDrag);
productWindowGallery.addEventListener("pointercancel", endGalleryDrag);

productWindowModalClose.addEventListener("click", closeProductWindowModal);
productWindowModalPrev.addEventListener("click", showProductWindowPrevious);
productWindowModalNext.addEventListener("click", showProductWindowNext);
productWindowModal.addEventListener("click", function (event) {
	if (event.target.hasAttribute("data-close-gallery")) {
		closeProductWindowModal();
	}
});

document.addEventListener("keydown", function (event) {
	if (productWindowModal.hidden) {
		return;
	}

	if (event.key === "Escape") {
		closeProductWindowModal();
	}

	if (event.key === "ArrowLeft") {
		showProductWindowPrevious();
	}

	if (event.key === "ArrowRight") {
		showProductWindowNext();
	}
});
