// SPDX-License-Identifier: Nebula

export type GamingPlatform = 'computer' | 'mobile' | 'console' | 'other';

export interface GamingEntry {
	id: string;
	name: string;
	platform: GamingPlatform;
	platforms?: Array<string>;
	provider?: 'igdb';
	provider_id?: string;
	cover_url?: string;
	source_url?: string;
}

export interface GamingActivity {
	game: GamingEntry;
	started_at: string;
	share_with_guilds: boolean;
}

export interface GamingProfile {
	games: Array<GamingEntry>;
	share_with_guilds: boolean;
	hidden_guild_ids: Array<string>;
	activity: GamingActivity | null;
}

export interface GuildGamingPlayer {
	user_id: string;
	game: GamingEntry;
	started_at: string;
}

export interface GuildGaming {
	games: Array<GamingEntry>;
	players: Array<GuildGamingPlayer>;
}
