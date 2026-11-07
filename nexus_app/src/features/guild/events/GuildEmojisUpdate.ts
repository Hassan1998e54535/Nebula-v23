// SPDX-License-Identifier: Nebula

import Emoji from '@app/features/emoji/state/Emoji';
import type {GatewayHandlerContext} from '@app/features/gateway/events/EventRouter';
import type {GuildEmoji} from '@nexus/schema/src/domains/guild/GuildEmojiSchemas';

export interface GuildEmojisUpdatePayload {
	guild_id: string;
	emojis: ReadonlyArray<GuildEmoji>;
}

export function handleGuildEmojisUpdate(data: GuildEmojisUpdatePayload, _context: GatewayHandlerContext): void {
	Emoji.handleGuildEmojiUpdated({guildId: data.guild_id, emojis: data.emojis});
}
