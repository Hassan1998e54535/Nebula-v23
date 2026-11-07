// SPDX-License-Identifier: Nebula

export const GatewayConnectionRole = Object.freeze({
	FOREGROUND: 'foreground',
	BACKGROUND: 'background',
} as const);

export type GatewayConnectionRole = (typeof GatewayConnectionRole)[keyof typeof GatewayConnectionRole];
