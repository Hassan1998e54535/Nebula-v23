// SPDX-License-Identifier: Nebula

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_DATA_URL_LENGTH = 2_400_000;
const MAX_IMAGE_EDGE = 1600;

type DecodedImage = {
	source: CanvasImageSource;
	width: number;
	height: number;
	dispose: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(file);
			return {
				source: bitmap,
				width: bitmap.width,
				height: bitmap.height,
				dispose: () => bitmap.close(),
			};
		} catch {
			// Fall through to the browser image decoder, which supports a different set of formats.
		}
	}

	const objectUrl = URL.createObjectURL(file);
	const image = new Image();
	image.src = objectUrl;
	try {
		if (typeof image.decode === 'function') {
			await image.decode();
		} else {
			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve();
				image.onerror = () => reject(new Error('Image decoding failed'));
			});
		}
		return {
			source: image,
			width: image.naturalWidth,
			height: image.naturalHeight,
			dispose: () => URL.revokeObjectURL(objectUrl),
		};
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw error;
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result);
			else reject(new Error('Unable to read the processed image'));
		};
		reader.onerror = () => reject(reader.error ?? new Error('Unable to read the processed image'));
		reader.readAsDataURL(blob);
	});
}

export async function compressWallpaperImage(file: File): Promise<string> {
	if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
		throw new Error('Choose a JPEG, PNG, or WebP image');
	}
	if (file.size > MAX_SOURCE_IMAGE_BYTES) {
		throw new Error('Image is too large');
	}

	const decoded = await decodeImage(file);
	try {
		if (decoded.width <= 0 || decoded.height <= 0) {
			throw new Error('Image has invalid dimensions');
		}
		const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(decoded.width * scale));
		canvas.height = Math.max(1, Math.round(decoded.height * scale));
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas is unavailable');
		context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
		if (!blob) throw new Error('Image compression failed');
		const dataUrl = await blobToDataUrl(blob);
		if (dataUrl.length > MAX_OUTPUT_DATA_URL_LENGTH) {
			throw new Error('Compressed image is too large');
		}
		return dataUrl;
	} finally {
		decoded.dispose();
	}
}
