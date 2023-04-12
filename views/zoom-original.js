"use strict";

document.addEventListener('DOMContentLoaded', function () {
    const image = document.getElementsByTagName('img')[0];
    const container = document.getElementById('container');
    if (!container) return;

    let isZoomed = false;
    let zoomLevel = 3;
    let scale = (image.width / image.height) * zoomLevel;

    container.addEventListener('click', event => {
        if (event.target === image) {
            if (!isZoomed) {
                const rect = image.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const y = (event.clientY - rect.top) / rect.height;

                const newWidth = image.naturalWidth * zoomLevel;
                const newHeight = image.naturalHeight * zoomLevel;

                image.style.transformOrigin = `${x * 100}% ${y * 100}%`;
                image.style.transform = `scale(${scale})`;
                image.style.width = `${newWidth}px`;
                image.style.height = `${newHeight}px`;

                image.classList.add('zoomed');
            } else {
                image.style.transform = '';
                image.style.width = '';
                image.style.height = '';
                image.classList.remove('zoomed');
            }

            isZoomed = !isZoomed;
        }
    });
});