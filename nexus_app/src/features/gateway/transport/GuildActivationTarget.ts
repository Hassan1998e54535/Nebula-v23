// SPDX-License-Identifier: Nebula

import {FAVORITES_GUILD_ID} from '@nexus/constants/src/AppConstants';

export function selectGuildActivationTarget(input: {
	selectedGuildId: string | null;
	openChannelGuildId: string | null;
}): string | null {
	if (input.selectedGuildId && input.selectedGuildId !== FAVORITES_GUILD_ID) {
		return input.selectedGuildId;
	}
	return input.openChannelGuildId;
}
