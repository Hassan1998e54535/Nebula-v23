// SPDX-License-Identifier: Nebula

import GuildAvailability from '@app/features/guild/state/GuildAvailability';
import Guilds from '@app/features/guild/state/Guilds';

export function handleGuildHealthUpdate(data: {guild_id: string; degraded: boolean}): void {
	if (Guilds.getGuild(data.guild_id)) {
		GuildAvailability.setGuildDegraded(data.guild_id, data.degraded);
	}
}
