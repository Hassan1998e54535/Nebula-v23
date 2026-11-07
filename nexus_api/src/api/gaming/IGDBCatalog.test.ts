// SPDX-License-Identifier: Nebula

import {createIGDBCatalogClient} from '@app/api/gaming/IGDBCatalog';
import {describe, expect, it, vi} from 'vitest';

function createJsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

describe('IGDB catalog client', () => {
	it('requests OAuth server-side and maps game covers and platforms', async () => {
		const fetchImpl = vi
			.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
			.mockResolvedValueOnce(createJsonResponse({access_token: 'app-token', expires_in: 3600}))
			.mockResolvedValueOnce(
				createJsonResponse([
					{
						id: 42,
						name: 'Example Quest',
						slug: 'example-quest',
						cover: {image_id: 'cover_42'},
						platforms: [{name: 'PC (Microsoft Windows)'}, {name: 'PlayStation 5'}],
					},
				]),
			);
		const client = createIGDBCatalogClient({
			clientId: 'test-client',
			clientSecret: 'test-secret',
			fetchImpl,
			minRequestIntervalMs: 0,
		});

		const games = await client.search('Example Quest');

		expect(games).toEqual([
			{
				id: 'igdb:42',
				name: 'Example Quest',
				platform: 'computer',
				platforms: ['PC (Microsoft Windows)', 'PlayStation 5'],
				provider: 'igdb',
				provider_id: '42',
				cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/cover_42.jpg',
				source_url: 'https://www.igdb.com/games/example-quest',
			},
		]);
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://id.twitch.tv/oauth2/token');
		expect(fetchImpl.mock.calls[1]?.[0]).toBe('https://api.igdb.com/v4/games');
		expect(fetchImpl.mock.calls[1]?.[1]?.headers).toMatchObject({
			'Client-ID': 'test-client',
			Authorization: 'Bearer app-token',
		});
	});

	it('reuses tokens and caches repeated search terms', async () => {
		const fetchImpl = vi
			.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
			.mockResolvedValueOnce(createJsonResponse({access_token: 'app-token', expires_in: 3600}))
			.mockResolvedValueOnce(createJsonResponse([{id: 7, name: 'Nova'}]));
		const client = createIGDBCatalogClient({
			clientId: 'test-client',
			clientSecret: 'test-secret',
			fetchImpl,
			minRequestIntervalMs: 0,
		});

		const first = await client.search('Nova');
		const second = await client.search('  nova ');

		expect(first).toEqual(second);
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('does not forward user quotes or control characters into the API query', async () => {
		const fetchImpl = vi
			.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
			.mockResolvedValueOnce(createJsonResponse({access_token: 'app-token', expires_in: 3600}))
			.mockResolvedValueOnce(createJsonResponse([]));
		const client = createIGDBCatalogClient({
			clientId: 'test-client',
			clientSecret: 'test-secret',
			fetchImpl,
			minRequestIntervalMs: 0,
		});

		await client.search('Test"; where id > 0; \n');

		const body = fetchImpl.mock.calls[1]?.[1]?.body;
		expect(body).toBe(
			'search "Test ; where id > 0;"; fields id,name,slug,cover.image_id,platforms.name; where version_parent = null; limit 12;',
		);
	});

	it('fails closed when OAuth or IGDB returns an unsuccessful response', async () => {
		const fetchImpl = vi
			.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
			.mockResolvedValueOnce(createJsonResponse({message: 'provider error'}, 401));
		const client = createIGDBCatalogClient({
			clientId: 'test-client',
			clientSecret: 'test-secret',
			fetchImpl,
			minRequestIntervalMs: 0,
		});

		await expect(client.search('Nova')).rejects.toMatchObject({kind: 'upstream'});
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('ignores malformed game records without failing the whole search', async () => {
		const fetchImpl = vi
			.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
			.mockResolvedValueOnce(createJsonResponse({access_token: 'app-token', expires_in: 3600}))
			.mockResolvedValueOnce(createJsonResponse([null, {id: 'bad', name: 'Invalid'}, {id: 8, name: 'Safe Game'}]));
		const client = createIGDBCatalogClient({
			clientId: 'test-client',
			clientSecret: 'test-secret',
			fetchImpl,
			minRequestIntervalMs: 0,
		});

		await expect(client.search('Safe Game')).resolves.toMatchObject([{id: 'igdb:8', name: 'Safe Game'}]);
	});
});
