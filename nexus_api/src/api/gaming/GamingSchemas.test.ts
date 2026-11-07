// SPDX-License-Identifier: Nebula

import {
	GamingActivityUpdateRequest,
	GamingCatalogSearchQuerySchema,
	GamingCatalogSearchResponseSchema,
	GamingEntrySchema,
	GamingProfileUpdateRequest,
} from '@nexus/schema/src/domains/gaming/GamingSchemas';
import {describe, expect, it} from 'vitest';

const game = {
	id: 'sky-odyssey',
	name: 'Sky Odyssey',
	platform: 'computer',
} as const;

describe('Gaming request schemas', () => {
	it('accepts a custom game activity and an explicit sharing choice', () => {
		expect(
			GamingActivityUpdateRequest.safeParse({
				game,
				share_with_guilds: false,
			}).success,
		).toBe(true);
	});

	it('rejects empty titles, unsupported platforms, and control characters', () => {
		expect(GamingEntrySchema.safeParse({...game, name: '  '}).success).toBe(false);
		expect(GamingEntrySchema.safeParse({...game, platform: 'browser'}).success).toBe(false);
		expect(GamingEntrySchema.safeParse({...game, name: 'Game\nTitle'}).success).toBe(false);
	});

	it('limits a user library to 100 entries', () => {
		const games = Array.from({length: 101}, (_, index) => ({
			...game,
			id: `game-${index}`,
			name: `Game ${index}`,
		}));
		expect(
			GamingProfileUpdateRequest.safeParse({
				games,
				share_with_guilds: false,
			}).success,
		).toBe(false);
	});

	it('validates IGDB search terms and only permits IGDB-owned artwork URLs', () => {
		expect(GamingCatalogSearchQuerySchema.safeParse({q: '  Elden Ring  '}).success).toBe(true);
		expect(GamingCatalogSearchQuerySchema.safeParse({q: 'x'}).success).toBe(false);

		const igdbGame = {
			...game,
			id: 'igdb:42',
			provider: 'igdb',
			provider_id: '42',
			cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/cover_42.jpg',
			source_url: 'https://www.igdb.com/games/example-quest',
		};
		expect(GamingCatalogSearchResponseSchema.safeParse({games: [igdbGame]}).success).toBe(true);
		expect(GamingEntrySchema.safeParse({...igdbGame, cover_url: 'https://untrusted.example/cover.jpg'}).success).toBe(
			false,
		);
	});
});
