// SPDX-License-Identifier: Nebula

import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import {TagStyles} from '@nexus/constants/src/AccountIdentityConstants';

export function isVisionaryDiscriminator0000Blocked(options: {
	showPremium: boolean;
	isVisionary: boolean;
	discriminator: string;
}): boolean {
	const {showPremium, isVisionary, discriminator} = options;
	if (RuntimeConfig.tagStyle !== TagStyles.RANDOM) return false;
	return showPremium && !isVisionary && discriminator === '0000';
}
