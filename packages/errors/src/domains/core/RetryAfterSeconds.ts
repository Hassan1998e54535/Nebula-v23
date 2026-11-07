// SPDX-License-Identifier: Nebula

export function sanitizeRetryAfterSeconds(value: number | undefined | null): number {
	if (value == null || !Number.isFinite(value) || value < 0) {
		return 1;
	}
	return Math.max(1, Math.ceil(value));
}

export function sanitizeRetryAfterDecimalSeconds(value: number | undefined | null, fallback: number): number {
	if (value == null || !Number.isFinite(value) || value < 0) {
		return fallback;
	}
	return Math.max(0.001, value);
}
