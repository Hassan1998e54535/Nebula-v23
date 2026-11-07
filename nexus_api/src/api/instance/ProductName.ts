// SPDX-License-Identifier: Nebula

import {Config} from '@app/api/Config';

let cachedProductName: string | null = null;

export function getDefaultProductName(): string {
	return Config.instance.branding.productName || 'NEXUS';
}

export function getInstanceProductName(): string {
	return cachedProductName ?? getDefaultProductName();
}

export function setCachedProductName(productName: string | null): void {
	cachedProductName = productName;
}
