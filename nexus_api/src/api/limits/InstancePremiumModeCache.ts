// SPDX-License-Identifier: Nebula

import type {InstancePremiumMode} from '@app/api/instance/InstanceConfigRepository';

let cachedPremiumMode: InstancePremiumMode = 'everyone';

export function getCachedInstancePremiumMode(): InstancePremiumMode {
	return cachedPremiumMode;
}

export function setCachedInstancePremiumMode(mode: InstancePremiumMode): void {
	cachedPremiumMode = mode;
}
