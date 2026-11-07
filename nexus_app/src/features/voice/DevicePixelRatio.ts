// SPDX-License-Identifier: Nebula

export function resolveDevicePixelRatio(ownerWindow: Window | null): number {
	if (ownerWindow == null) {
		return 1;
	}
	const devicePixelRatio = ownerWindow.devicePixelRatio;
	if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) {
		return 1;
	}
	return devicePixelRatio;
}
