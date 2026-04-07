const aboutmeModal = document.getElementById("projectModal");
const aboutmeModalImage = document.getElementById("projectModalImage");
const aboutmeModalTitle = document.getElementById("projectModalTitle");
const aboutmeModalDescription = document.getElementById("projectModalDescription");
const aboutmeModalStrip = document.getElementById("projectModalStrip");
const aboutmeModalClose = document.getElementById("projectModalClose");
const aboutmeModalPrev = document.getElementById("projectModalPrev");
const aboutmeModalNext = document.getElementById("projectModalNext");
const aboutmeProjectTriggers = document.querySelectorAll(".project-trigger");

let aboutmeLastTrigger = null;
let aboutmeGalleryImages = [];
let aboutmeCurrentIndex = 0;

function buildGalleryCandidates(trigger) {
	const explicitImages = (trigger.dataset.images || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

	if (explicitImages.length > 0) {
		return explicitImages;
	}

	const candidates = [];
	const mainImage = trigger.dataset.mainImage;
	const extraImages = (trigger.dataset.extraImages || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	const galleryDir = trigger.dataset.galleryDir || "";
	const galleryCount = Number.parseInt(trigger.dataset.galleryCount || "0", 10);

	if (mainImage) {
		candidates.push(mainImage);
	}

	candidates.push(...extraImages);

	for (let index = 0; index < galleryCount; index += 1) {
		candidates.push(`${galleryDir}img${index}.jpg`);
	}

	return [...new Set(candidates)];
}

function updateMainImage(index, title) {
	const src = aboutmeGalleryImages[index];
	if (!src) {
		return;
	}

	aboutmeCurrentIndex = index;
	aboutmeModalImage.src = src;
	aboutmeModalImage.alt = title;

	const stripButtons = aboutmeModalStrip.querySelectorAll(".project-modal-thumb");
	stripButtons.forEach((item) => {
		item.classList.toggle("is-active", Number(item.dataset.index) === index);
	});

	const canNavigate = aboutmeGalleryImages.length > 1;
	aboutmeModalPrev.hidden = !canNavigate;
	aboutmeModalNext.hidden = !canNavigate;
}

function renderGalleryStrip(images, title) {
	aboutmeModalStrip.innerHTML = "";

	images.forEach((src, index) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "project-modal-thumb";
		button.dataset.index = String(index);
		if (index === 0) {
			button.classList.add("is-active");
		}

		const image = document.createElement("img");
		image.src = src;
		image.alt = `${title} 附屬圖片 ${index + 1}`;
		image.loading = "lazy";
		image.decoding = "async";
		button.appendChild(image);

		button.addEventListener("click", function () {
			updateMainImage(index, title);
		});

		aboutmeModalStrip.appendChild(button);
	});
}

function showPreviousImage() {
	if (aboutmeGalleryImages.length < 2) {
		return;
	}

	const nextIndex = (aboutmeCurrentIndex - 1 + aboutmeGalleryImages.length) % aboutmeGalleryImages.length;
	updateMainImage(nextIndex, aboutmeModalTitle.textContent);
}

function showNextImage() {
	if (aboutmeGalleryImages.length < 2) {
		return;
	}

	const nextIndex = (aboutmeCurrentIndex + 1) % aboutmeGalleryImages.length;
	updateMainImage(nextIndex, aboutmeModalTitle.textContent);
}

function openProjectModal(trigger) {
	const title = trigger.dataset.title || "";
	const description = trigger.dataset.description || "";
	const galleryImages = buildGalleryCandidates(trigger);

	if (galleryImages.length === 0) {
		return;
	}

	aboutmeLastTrigger = trigger;
	aboutmeGalleryImages = galleryImages;
	aboutmeCurrentIndex = 0;
	aboutmeModalTitle.textContent = title;
	aboutmeModalDescription.textContent = description;
	renderGalleryStrip(galleryImages, title);
	updateMainImage(0, title);
	aboutmeModal.hidden = false;
	document.body.classList.add("project-modal-open");
}

function closeProjectModal() {
	aboutmeModal.hidden = true;
	document.body.classList.remove("project-modal-open");
	aboutmeModalImage.src = "";
	aboutmeModalStrip.innerHTML = "";
	aboutmeGalleryImages = [];
	aboutmeCurrentIndex = 0;

	if (aboutmeLastTrigger) {
		aboutmeLastTrigger.focus();
	}
}

aboutmeProjectTriggers.forEach((trigger) => {
	trigger.addEventListener("click", function () {
		openProjectModal(trigger);
	});
});

aboutmeModalClose.addEventListener("click", closeProjectModal);
aboutmeModalPrev.addEventListener("click", showPreviousImage);
aboutmeModalNext.addEventListener("click", showNextImage);
aboutmeModal.addEventListener("click", function (event) {
	if (event.target.hasAttribute("data-close-modal")) {
		closeProjectModal();
	}
});

document.addEventListener("keydown", function (event) {
	if (aboutmeModal.hidden) {
		return;
	}

	if (event.key === "Escape") {
		closeProjectModal();
	}

	if (event.key === "ArrowLeft") {
		showPreviousImage();
	}

	if (event.key === "ArrowRight") {
		showNextImage();
	}
});
