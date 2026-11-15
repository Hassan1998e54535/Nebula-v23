// SPDX-License-Identifier: Nebula

import type {UserID} from '@app/api/BrandedTypes';
import {resolveHiddenGamingGuildIds, shouldShareGamingActivityInGuild} from '@app/api/gaming/GamingPrivacy';
import {IGDBCatalogError, searchIGDBGames} from '@app/api/gaming/IGDBCatalog';
import {DefaultUserOnly} from '@app/api/middleware/AuthMiddleware';
import {RateLimitMiddleware} from '@app/api/middleware/RateLimitMiddleware';
import {OpenAPI} from '@app/api/middleware/ResponseTypeMiddleware';
import {getKVClient} from '@app/api/middleware/ServiceRegistry';
import {RateLimitConfigs} from '@app/api/RateLimitConfig';
import type {HonoApp, HonoEnv} from '@app/api/types/HonoEnv';
import {Validator} from '@app/api/Validator';
import {AccessDeniedError} from '@nexus/errors/src/domains/core/AccessDeniedError';
import {MissingAccessError} from '@nexus/errors/src/domains/core/MissingAccessError';
import {ServiceUnavailableError} from '@nexus/errors/src/domains/core/ServiceUnavailableError';
import {GuildIdParam} from '@nexus/schema/src/domains/common/CommonParamSchemas';
import type {GamingEntry} from '@nexus/schema/src/domains/gaming/GamingSchemas';
import {
	GamingActivityUpdateRequest,
	GamingCatalogSearchQuerySchema,
	GamingCatalogSearchResponseSchema,
	GamingProfileResponse,
	GamingProfileUpdateRequest,
	GuildGamingResponse,
	GuildGamingUpdateRequest,
} from '@nexus/schema/src/domains/gaming/GamingSchemas';
import type {Context} from 'hono';

const ACTIVITY_TTL_SECONDS = 120;
const ACTIVITY_MAX_AGE_MS = ACTIVITY_TTL_SECONDS * 1000;
const profileKey = (userId: string) => `nexus:gaming:profile:${userId}`;
const activityKey = (userId: string) => `nexus:gaming:activity:${userId}`;
const guildGamesKey = (guildId: string) => `nexus:gaming:guild:${guildId}:games`;
const guildPlayersKey = (guildId: string) => `nexus:gaming:guild:${guildId}:players`;

interface StoredProfile {
	games: Array<GamingEntry>;
	share_with_guilds: boolean;
	hidden_guild_ids: Array<string>;
}

interface StoredActivity {
	user_id: string;
	game: GamingEntry;
	started_at: string;
	updated_at: number;
	share_with_guilds: boolean;
	hidden_guild_ids?: Array<string>;
}

async function getMemberGuilds(ctx: Context<HonoEnv>, userId: UserID) {
	return ctx.get('guildService').data.operations.getUserGuilds(userId, {});
}

function parseStoredProfile(rawProfile: string | null): StoredProfile {
	const stored = rawProfile ? (JSON.parse(rawProfile) as Partial<StoredProfile>) : null;
	return {
		games: Array.isArray(stored?.games) ? stored.games : [],
		share_with_guilds: stored?.share_with_guilds === true,
		hidden_guild_ids: Array.isArray(stored?.hidden_guild_ids)
			? stored.hidden_guild_ids.filter((guildId): guildId is string => typeof guildId === 'string')
			: [],
	};
}

export function GamingController(app: HonoApp): void {
	app.get(
		'/users/@me/gaming',
		DefaultUserOnly,
		OpenAPI({
			operationId: 'get_my_gaming_profile',
			summary: 'Get current user gaming profile',
			description:
				'Returns the signed-in user’s custom game library, sharing preference, and current short-lived activity.',
			responseSchema: GamingProfileResponse,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const userKey = String(userId);
			const kv = getKVClient();
			const [rawProfile, rawActivity] = await Promise.all([kv.get(profileKey(userKey)), kv.get(activityKey(userKey))]);
			const profile = parseStoredProfile(rawProfile);
			const activity: StoredActivity | null = rawActivity ? JSON.parse(rawActivity) : null;
			return ctx.json({
				games: profile.games,
				share_with_guilds: profile.share_with_guilds,
				hidden_guild_ids: profile.hidden_guild_ids,
				activity: activity
					? {game: activity.game, started_at: activity.started_at, share_with_guilds: activity.share_with_guilds}
					: null,
			});
		},
	);

	app.put(
		'/users/@me/gaming',
		DefaultUserOnly,
		Validator('json', GamingProfileUpdateRequest),
		OpenAPI({
			operationId: 'update_my_gaming_profile',
			summary: 'Update current user gaming library and privacy',
			description: 'Saves custom game titles and the user’s opt-in preference for sharing activity in guilds.',
			responseSchema: GamingProfileResponse,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const userKey = String(userId);
			const {games, share_with_guilds, hidden_guild_ids: requestedHiddenGuildIds} = ctx.req.valid('json');
			const kv = getKVClient();
			const previousProfile = parseStoredProfile(await kv.get(profileKey(userKey)));
			const guilds = await getMemberGuilds(ctx, userId);
			const memberGuildIds = new Set(guilds.map((guild) => String(guild.id)));
			const hiddenGuildIds = resolveHiddenGamingGuildIds(
				requestedHiddenGuildIds?.map(String),
				previousProfile.hidden_guild_ids,
				memberGuildIds,
			);
			const profile: StoredProfile = {games, share_with_guilds, hidden_guild_ids: hiddenGuildIds};
			await kv.set(profileKey(userKey), JSON.stringify(profile));
			const rawActivity = await kv.get(activityKey(userKey));
			let activity: StoredActivity | null = rawActivity ? JSON.parse(rawActivity) : null;
			if (activity && !games.some((entry) => entry.id === activity?.game.id)) {
				await kv.del(activityKey(userKey));
				await Promise.all(guilds.map((guild) => kv.hdel(guildPlayersKey(guild.id), userKey)));
				activity = null;
			}
			if (activity) {
				activity.share_with_guilds = share_with_guilds;
				activity.hidden_guild_ids = hiddenGuildIds;
				activity.updated_at = Date.now();
				await kv.setex(activityKey(userKey), ACTIVITY_TTL_SECONDS, JSON.stringify(activity));
				await Promise.all(
					guilds.map((guild) =>
						shouldShareGamingActivityInGuild(profile.share_with_guilds, profile.hidden_guild_ids, guild.id)
							? kv.hset(guildPlayersKey(guild.id), userKey, JSON.stringify(activity))
							: kv.hdel(guildPlayersKey(guild.id), userKey),
					),
				);
			}
			return ctx.json({
				games,
				share_with_guilds,
				hidden_guild_ids: hiddenGuildIds,
				activity: activity ? {game: activity.game, started_at: activity.started_at, share_with_guilds} : null,
			});
		},
	);

	app.put(
		'/users/@me/gaming/activity',
		DefaultUserOnly,
		Validator('json', GamingActivityUpdateRequest),
		OpenAPI({
			operationId: 'start_my_game_activity',
			summary: 'Start or refresh current game activity',
			description: 'Starts or refreshes the current game activity and publishes it only to guilds when opted in.',
			responseSchema: GamingProfileResponse,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const userKey = String(userId);
			const {game, share_with_guilds} = ctx.req.valid('json');
			const kv = getKVClient();
			const [rawProfile, rawActivity] = await Promise.all([kv.get(profileKey(userKey)), kv.get(activityKey(userKey))]);
			const profile = parseStoredProfile(rawProfile);
			if (!profile.games.some((entry) => entry.id === game.id)) {
				profile.games.push(game);
			}
			const previous: StoredActivity | null = rawActivity ? JSON.parse(rawActivity) : null;
			const activity: StoredActivity = {
				user_id: userKey,
				game,
				started_at: previous?.game.id === game.id ? previous.started_at : new Date().toISOString(),
				updated_at: Date.now(),
				share_with_guilds,
				hidden_guild_ids: profile.hidden_guild_ids,
			};
			await kv.setex(activityKey(userKey), ACTIVITY_TTL_SECONDS, JSON.stringify(activity));
			profile.share_with_guilds = share_with_guilds;
			await kv.set(profileKey(userKey), JSON.stringify(profile));
			const guilds = await getMemberGuilds(ctx, userId);
			await Promise.all(
				guilds.map((guild) =>
					shouldShareGamingActivityInGuild(profile.share_with_guilds, profile.hidden_guild_ids, guild.id)
						? kv.hset(guildPlayersKey(guild.id), userKey, JSON.stringify(activity))
						: kv.hdel(guildPlayersKey(guild.id), userKey),
				),
			);
			return ctx.json({
				games: profile.games,
				share_with_guilds,
				hidden_guild_ids: profile.hidden_guild_ids,
				activity: {game, started_at: activity.started_at, share_with_guilds},
			});
		},
	);

	app.delete(
		'/users/@me/gaming/activity',
		DefaultUserOnly,
		OpenAPI({
			operationId: 'stop_my_game_activity',
			summary: 'Stop current game activity',
			description: 'Stops the current activity and removes it from all guild activity lists.',
			responseSchema: GamingProfileResponse,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const userKey = String(userId);
			const kv = getKVClient();
			const rawProfile = await kv.get(profileKey(userKey));
			const profile = parseStoredProfile(rawProfile);
			await kv.del(activityKey(userKey));
			const guilds = await getMemberGuilds(ctx, userId);
			await Promise.all(guilds.map((guild) => kv.hdel(guildPlayersKey(guild.id), userKey)));
			return ctx.json({
				games: profile.games,
				share_with_guilds: profile.share_with_guilds,
				hidden_guild_ids: profile.hidden_guild_ids,
				activity: null,
			});
		},
	);

	app.get(
		'/guilds/:guild_id/gaming/catalog/search',
		DefaultUserOnly,
		Validator('param', GuildIdParam),
		Validator('query', GamingCatalogSearchQuerySchema),
		RateLimitMiddleware(RateLimitConfigs.GUILD_GAMING_CATALOG_SEARCH),
		OpenAPI({
			operationId: 'search_guild_gaming_catalog',
			summary: 'Search IGDB games for a guild owner',
			description:
				'Searches IGDB for game titles and licensed cover artwork. Only the guild owner may use this search.',
			responseSchema: GamingCatalogSearchResponseSchema,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const guildId = String(ctx.req.valid('param').guild_id);
			const guilds = await getMemberGuilds(ctx, userId);
			const guild = guilds.find((entry) => entry.id === guildId);
			if (!guild) throw new MissingAccessError();
			if (guild.owner_id !== String(userId)) throw new AccessDeniedError();

			try {
				const {q} = ctx.req.valid('query');
				return ctx.json({games: await searchIGDBGames(q)});
			} catch (error) {
				if (error instanceof IGDBCatalogError) {
					throw new ServiceUnavailableError({message: 'The game catalog is temporarily unavailable.'});
				}
				throw error;
			}
		},
	);

	app.get(
		'/guilds/:guild_id/gaming',
		DefaultUserOnly,
		Validator('param', GuildIdParam),
		OpenAPI({
			operationId: 'get_guild_gaming',
			summary: 'Get a guild game catalog and currently shared player activity',
			description: 'Returns the game catalog and currently active member activities visible to a guild member.',
			responseSchema: GuildGamingResponse,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const guildId = String(ctx.req.valid('param').guild_id);
			const guilds = await getMemberGuilds(ctx, userId);
			if (!guilds.some((guild) => guild.id === guildId)) {
				throw new MissingAccessError();
			}
			const kv = getKVClient();
			const [rawGames, storedPlayers] = await Promise.all([
				kv.get(guildGamesKey(guildId)),
				kv.hgetall(guildPlayersKey(guildId)),
			]);
			const now = Date.now();
			const players = Object.entries(storedPlayers)
				.map(([playerId, raw]) => {
					const activity: StoredActivity = JSON.parse(raw);
					return {playerId, activity};
				})
				.filter(
					({activity}) =>
						now - activity.updated_at <= ACTIVITY_MAX_AGE_MS &&
						activity.share_with_guilds &&
						!(activity.hidden_guild_ids ?? []).includes(guildId),
				);
			const activePlayerIds = new Set(players.map((player) => player.playerId));
			const stalePlayers = Object.keys(storedPlayers).filter((playerId) => !activePlayerIds.has(playerId));
			if (stalePlayers.length > 0) {
				await kv.hdel(guildPlayersKey(guildId), ...stalePlayers);
			}
			return ctx.json({
				games: rawGames ? JSON.parse(rawGames) : [],
				players: players.map(({playerId, activity}) => ({
					user_id: playerId,
					game: activity.game,
					started_at: activity.started_at,
				})),
			});
		},
	);

	app.put(
		'/guilds/:guild_id/gaming',
		DefaultUserOnly,
		Validator('param', GuildIdParam),
		Validator('json', GuildGamingUpdateRequest),
		OpenAPI({
			operationId: 'update_guild_gaming',
			summary: 'Update a guild game catalog',
			description: 'Allows the guild owner to manage the custom game list shown to guild members.',
			responseSchema: GuildGamingResponse,
			statusCode: 200,
			security: ['sessionToken', 'bearerToken'],
			tags: ['Gaming'],
		}),
		async (ctx) => {
			const userId = ctx.get('user').id;
			const guildId = String(ctx.req.valid('param').guild_id);
			const guilds = await getMemberGuilds(ctx, userId);
			const guild = guilds.find((entry) => entry.id === guildId);
			if (!guild) {
				throw new MissingAccessError();
			}
			if (guild.owner_id !== String(userId)) {
				throw new AccessDeniedError();
			}
			const {games} = ctx.req.valid('json');
			await getKVClient().set(guildGamesKey(guildId), JSON.stringify(games));
			const storedPlayers = await getKVClient().hgetall(guildPlayersKey(guildId));
			const now = Date.now();
			return ctx.json({
				games,
				players: Object.entries(storedPlayers)
					.map(([playerId, raw]) => ({playerId, activity: JSON.parse(raw) as StoredActivity}))
					.filter(({activity}) => now - activity.updated_at <= ACTIVITY_MAX_AGE_MS)
					.map(({playerId, activity}) => ({
						user_id: playerId,
						game: activity.game,
						started_at: activity.started_at,
					})),
			});
		},
	);
}
