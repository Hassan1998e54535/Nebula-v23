// SPDX-License-Identifier: Nebula

export const RelativePosition = Object.freeze({
	BEFORE: 'before',
	AFTER: 'after',
} as const);

export type RelativePosition = (typeof RelativePosition)[keyof typeof RelativePosition];
