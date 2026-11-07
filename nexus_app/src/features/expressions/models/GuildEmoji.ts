// SPDX-License-Identifier: Nebula

import {buildCustomEmojiURL} from '@app/features/expressions/utils/CustomEmojiImageUrl';
import type {GuildEmoji as WireGuildEmoji} from '@nexus/schema/src/domains/guild/GuildEmojiSchemas';
import type {UserPartial} from '@nexus/schema/src/domains/user/UserResponseSchemas';

export class GuildEmoji {
	readonly id: string;
	readonly guildId: string;
	readonly name: string;
	readonly uniqueName: string;
	readonly allNamesString: string;
	readonly url: string;
	readonly animated: boolean;
	readonly user?: UserPartial;

	constructor(guildId: string, data: WireGuildEmoji) {
		this.id = data.id;
		this.guildId = guildId;
		this.name = data.name;
		this.uniqueName = data.name;
		this.allNamesString = `:${data.name}:`;
		this.url = buildCustomEmojiURL({id: data.id, animated: data.animated});
		this.animated = data.animated;
		this.user = data.user;
	}

	toJSON(): WireGuildEmoji {
		return {
			id: this.id,
			name: this.name,
			animated: this.animated,
			user: this.user,
		};
	}
}
