// SPDX-License-Identifier: Nebula

import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import GuildBans from '@app/features/guild/state/GuildBans';
import type {UserPartial} from '@nexus/schema/src/domains/user/UserResponseSchemas';

interface GuildBanPayload {
	guild_id: string;
	user: UserPartial;
}

export function handleGuildBanAdd(data: GuildBanPayload, _context: GatewayHandlerContext): void {
	GuildBans.noteBan(data.guild_id, data.user.id);
}

export function handleGuildBanRemove(data: GuildBanPayload, _context: GatewayHandlerContext): void {
	GuildBans.noteUnban(data.guild_id, data.user.id);
}
