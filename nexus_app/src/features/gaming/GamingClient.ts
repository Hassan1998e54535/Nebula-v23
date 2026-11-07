// SPDX-License-Identifier: Nebula

import {Endpoints} from '@app/features/app/constants/Endpoints';
import type {GamingEntry, GamingProfile, GuildGaming} from '@app/features/gaming/GamingTypes';
import {http} from '@app/features/platform/transport/RestTransport';

export async function fetchGamingProfile(): Promise<GamingProfile> {
	return (await http.get<GamingProfile>(Endpoints.USER_GAMING)).body;
}

export async function saveGamingProfile(games: Array<GamingEntry>, shareWithGuilds: boolean): Promise<GamingProfile> {
	return (
		await http.put<GamingProfile>(Endpoints.USER_GAMING, {
			body: {games, share_with_guilds: shareWithGuilds},
		})
	).body;
}

export async function startGamingActivity(game: GamingEntry, shareWithGuilds: boolean): Promise<GamingProfile> {
	return (
		await http.put<GamingProfile>(Endpoints.USER_GAMING_ACTIVITY, {
			body: {game, share_with_guilds: shareWithGuilds},
		})
	).body;
}

export async function stopGamingActivity(): Promise<GamingProfile> {
	return (await http.delete<GamingProfile>(Endpoints.USER_GAMING_ACTIVITY)).body;
}

export async function fetchGuildGaming(guildId: string): Promise<GuildGaming> {
	return (await http.get<GuildGaming>(Endpoints.GUILD_GAMING(guildId))).body;
}

export async function saveGuildGaming(guildId: string, games: Array<GamingEntry>): Promise<GuildGaming> {
	return (
		await http.put<GuildGaming>(Endpoints.GUILD_GAMING(guildId), {
			body: {games},
		})
	).body;
}

export async function searchGuildGamingCatalog(guildId: string, query: string): Promise<Array<GamingEntry>> {
	return (await http.get<{games: Array<GamingEntry>}>(Endpoints.GUILD_GAMING_CATALOG_SEARCH(guildId, query))).body
		.games;
}
