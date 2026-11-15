// SPDX-License-Identifier: Nebula

import {z} from 'zod';
import {SnowflakeType} from '@nexus/schema/src/primitives/SchemaPrimitives';

export const GamingPlatformSchema = z.enum(['computer', 'mobile', 'console', 'other']);

function isIGDBCoverUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' && url.hostname === 'images.igdb.com' && url.pathname.startsWith('/igdb/image/upload/')
		);
	} catch {
		return false;
	}
}

function isIGDBSourceUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			(url.hostname === 'igdb.com' || url.hostname === 'www.igdb.com') &&
			url.pathname.startsWith('/games/')
		);
	} catch {
		return false;
	}
}

const IGDBCoverUrlSchema = z.string().url().max(300).refine(isIGDBCoverUrl);
const IGDBSourceUrlSchema = z.string().url().max(300).refine(isIGDBSourceUrl);

export const GamingEntrySchema = z.object({
	id: z
		.string()
		.min(1)
		.max(160)
		.refine((value) => !/\p{Cc}/u.test(value)),
	name: z
		.string()
		.trim()
		.min(1)
		.max(160)
		.refine((value) => !/\p{Cc}/u.test(value)),
	platform: GamingPlatformSchema,
	platforms: z.array(z.string().trim().min(1).max(80)).max(16).optional(),
	provider: z.literal('igdb').optional(),
	provider_id: z
		.string()
		.regex(/^\d{1,20}$/u)
		.optional(),
	cover_url: IGDBCoverUrlSchema.optional(),
	source_url: IGDBSourceUrlSchema.optional(),
});

export const GamingCatalogSearchQuerySchema = z.object({
	q: z
		.string()
		.trim()
		.min(2)
		.max(80)
		.refine((value) => !/\p{Cc}/u.test(value)),
});

export const GamingCatalogSearchResponseSchema = z.object({
	games: z.array(GamingEntrySchema).max(12),
});

export const GamingProfileResponse = z.object({
	games: z.array(GamingEntrySchema).max(100),
	share_with_guilds: z.boolean(),
	hidden_guild_ids: z.array(SnowflakeType).max(2000),
	activity: z
		.object({
			game: GamingEntrySchema,
			started_at: z.string(),
			share_with_guilds: z.boolean(),
		})
		.nullable(),
});

export const GamingProfileUpdateRequest = z.object({
	games: z.array(GamingEntrySchema).max(100),
	share_with_guilds: z.boolean(),
	hidden_guild_ids: z.array(SnowflakeType).max(2000).optional(),
});

export const GamingActivityUpdateRequest = z.object({
	game: GamingEntrySchema,
	share_with_guilds: z.boolean(),
});

export const GuildGamingResponse = z.object({
	games: z.array(GamingEntrySchema).max(100),
	players: z.array(
		z.object({
			user_id: z.string(),
			game: GamingEntrySchema,
			started_at: z.string(),
		}),
	),
});

export const GuildGamingUpdateRequest = z.object({
	games: z.array(GamingEntrySchema).max(100),
});

export type GamingPlatform = z.infer<typeof GamingPlatformSchema>;
export type GamingEntry = z.infer<typeof GamingEntrySchema>;
export type GamingProfile = z.infer<typeof GamingProfileResponse>;
export type GuildGaming = z.infer<typeof GuildGamingResponse>;
