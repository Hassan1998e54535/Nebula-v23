// SPDX-License-Identifier: Nebula

export function getAdaptivePadding(ownerWindow: Window): number {
	const width = ownerWindow.innerWidth;
	const height = ownerWindow.innerHeight;
	const minDimension = Math.min(width, height);
	if (minDimension < 400) return 4;
	if (minDimension < 768) return 8;
	if (minDimension < 1024) return 12;
	return 16;
}
