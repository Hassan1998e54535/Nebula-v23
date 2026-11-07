// SPDX-License-Identifier: Nebula

import type {LimitKey} from '@nexus/constants/src/LimitConfigMetadata';

function isToggleActive(limitValue: number): boolean {
	return limitValue > 0;
}

export function isLimitToggleEnabled(limits: Partial<Record<LimitKey, number>>, feature: LimitKey): boolean {
	const value = limits[feature];
	if (value === undefined || value === null) return false;
	return isToggleActive(value);
}
