// SPDX-License-Identifier: Nebula

export function isObjectLike(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return isObjectLike(value) && !Array.isArray(value);
}
