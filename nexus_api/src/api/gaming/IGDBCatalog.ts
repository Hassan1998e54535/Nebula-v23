// SPDX-License-Identifier: Nebula

import type {GamingEntry} from '@nexus/schema/src/domains/gaming/GamingSchemas';

const IGDB_GAMES_URL = 'https://api.igdb.com/v4/games';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const SEARCH_CACHE_TTL_MS = 60_000;
const DEFAULT_REQUEST_INTERVAL_MS = 350;
const REQUEST_TIMEOUT_MS = 8_000;

type IGDBGame = {
	id: number;
	name: string;
	slug?: string;
	cover?: {image_id?: string} | null;
	platforms?: Array<{name?: string} | null> | null;
};

type IGDBTokenResponse = {
	access_token?: string;
	expires_in?: number;
};

type FetchLike = typeof fetch;

type IGDBCatalogClientOptions = {
	clientId: string;
	clientSecret: string;
	fetchImpl?: FetchLike;
	now?: () => number;
	minRequestIntervalMs?: number;
};

export type IGDBCatalogErrorKind = 'not_configured' | 'upstream';

export class IGDBCatalogError extends Error {
	constructor(readonly kind: IGDBCatalogErrorKind) {
		super(kind === 'not_configured' ? 'IGDB credentials are not configured.' : 'IGDB is temporarily unavailable.');
		this.name = 'IGDBCatalogError';
	}
}

function normalizeSearchQuery(query: string): string {
	return query.normalize('NFKC').trim().toLocaleLowerCase();
}

function escapeSearchQuery(query: string): string {
	const withoutControls = Array.from(query)
		.filter((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint > 0x1f && codePoint !== 0x7f;
		})
		.join('');
	return withoutControls.replace(/["\\]/gu, ' ').trim().slice(0, 80);
}

function classifyPlatform(platforms: Array<string>): GamingEntry['platform'] {
	if (platforms.some((name) => /\b(pc|windows|linux|mac|macos)\b/iu.test(name))) return 'computer';
	if (platforms.some((name) => /\b(android|ios|iphone|ipad|mobile)\b/iu.test(name))) return 'mobile';
	if (
		platforms.some((name) =>
			/\b(playstation|xbox|nintendo|switch|wii|game boy|gameboy|dreamcast|sega|atari|neo geo)\b/iu.test(name),
		)
	) {
		return 'console';
	}
	return 'other';
}

function mapIGDBGame(value: unknown): GamingEntry | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const game = value as IGDBGame;
	if (!Number.isSafeInteger(game.id) || game.id < 1 || typeof game.name !== 'string') return null;
	const name = game.name.trim();
	if (!name || name.length > 160) return null;

	const platforms = Array.from(
		new Set(
			(Array.isArray(game.platforms) ? game.platforms : [])
				.map((platform) => {
					if (typeof platform !== 'object' || platform === null || typeof platform.name !== 'string') return null;
					return platform.name.trim();
				})
				.filter((platform): platform is string => Boolean(platform))
				.map((platform) => platform.slice(0, 80)),
		),
	).slice(0, 16);
	const imageId = typeof game.cover?.image_id === 'string' ? game.cover.image_id.trim() : undefined;
	const slug = typeof game.slug === 'string' ? game.slug.trim() : undefined;

	return {
		id: `igdb:${game.id}`,
		name,
		platform: classifyPlatform(platforms),
		...(platforms.length > 0 ? {platforms} : {}),
		provider: 'igdb',
		provider_id: String(game.id),
		...(imageId && /^[A-Za-z0-9_-]{1,100}$/u.test(imageId)
			? {cover_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`}
			: {}),
		...(slug && /^[A-Za-z0-9_-]{1,160}$/u.test(slug)
			? {source_url: `https://www.igdb.com/games/${encodeURIComponent(slug)}`}
			: {}),
	};
}

export function createIGDBCatalogClient({
	clientId,
	clientSecret,
	fetchImpl = globalThis.fetch,
	now = Date.now,
	minRequestIntervalMs = DEFAULT_REQUEST_INTERVAL_MS,
}: IGDBCatalogClientOptions) {
	let accessToken: string | null = null;
	let tokenExpiresAt = 0;
	let lastRequestAt = 0;
	let requestQueue: Promise<void> = Promise.resolve();
	const searchCache = new Map<string, {expiresAt: number; games: Array<GamingEntry>}>();
	const inFlightSearches = new Map<string, Promise<Array<GamingEntry>>>();

	const waitForRequestSlot = () => {
		const nextRequest = requestQueue.then(async () => {
			const waitMs = minRequestIntervalMs - (now() - lastRequestAt);
			if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
			lastRequestAt = now();
		});
		requestQueue = nextRequest.catch(() => undefined);
		return nextRequest;
	};

	const request = async (url: string, init: RequestInit) => {
		await waitForRequestSlot();
		return fetchImpl(url, {...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
	};

	const getAccessToken = async (): Promise<string> => {
		if (accessToken && tokenExpiresAt - now() > 60_000) return accessToken;

		const body = new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'client_credentials',
		});
		let response: Response;
		try {
			response = await request(TWITCH_TOKEN_URL, {
				method: 'POST',
				headers: {'content-type': 'application/x-www-form-urlencoded'},
				body: body.toString(),
			});
		} catch {
			throw new IGDBCatalogError('upstream');
		}

		if (!response.ok) throw new IGDBCatalogError('upstream');
		let payload: IGDBTokenResponse;
		try {
			const parsed: unknown = await response.json();
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				throw new Error('Invalid OAuth response.');
			}
			payload = parsed as IGDBTokenResponse;
		} catch {
			throw new IGDBCatalogError('upstream');
		}
		if (
			typeof payload.access_token !== 'string' ||
			!payload.access_token ||
			typeof payload.expires_in !== 'number' ||
			!Number.isFinite(payload.expires_in) ||
			payload.expires_in <= 0
		) {
			throw new IGDBCatalogError('upstream');
		}

		accessToken = payload.access_token;
		tokenExpiresAt = now() + payload.expires_in * 1000;
		return accessToken;
	};

	const performSearch = async (query: string): Promise<Array<GamingEntry>> => {
		const token = await getAccessToken();
		const safeQuery = escapeSearchQuery(query);
		const apicalypseQuery =
			`search "${safeQuery}"; ` +
			'fields id,name,slug,cover.image_id,platforms.name; ' +
			'where version_parent = null; limit 12;';

		let response: Response;
		try {
			response = await request(IGDB_GAMES_URL, {
				method: 'POST',
				headers: {
					'Client-ID': clientId,
					Authorization: `Bearer ${token}`,
					Accept: 'application/json',
					'Content-Type': 'text/plain',
				},
				body: apicalypseQuery,
			});
		} catch {
			throw new IGDBCatalogError('upstream');
		}

		if (!response.ok) throw new IGDBCatalogError('upstream');
		let payload: Array<unknown>;
		try {
			const parsed: unknown = await response.json();
			if (!Array.isArray(parsed)) throw new Error('Invalid IGDB response.');
			payload = parsed;
		} catch {
			throw new IGDBCatalogError('upstream');
		}
		return payload
			.map(mapIGDBGame)
			.filter((game): game is GamingEntry => game !== null)
			.slice(0, 12);
	};

	const search = async (query: string): Promise<Array<GamingEntry>> => {
		const normalizedQuery = normalizeSearchQuery(query);
		if (normalizedQuery.length < 2) return [];

		const cached = searchCache.get(normalizedQuery);
		if (cached && cached.expiresAt > now()) return cached.games;

		const existingSearch = inFlightSearches.get(normalizedQuery);
		if (existingSearch) return existingSearch;

		const searchPromise = performSearch(query)
			.then((games) => {
				searchCache.set(normalizedQuery, {games, expiresAt: now() + SEARCH_CACHE_TTL_MS});
				if (searchCache.size > 100) {
					const oldestKey = searchCache.keys().next().value;
					if (oldestKey) searchCache.delete(oldestKey);
				}
				return games;
			})
			.finally(() => inFlightSearches.delete(normalizedQuery));
		inFlightSearches.set(normalizedQuery, searchPromise);
		return searchPromise;
	};

	return {search};
}

let runtimeClient: ReturnType<typeof createIGDBCatalogClient> | null = null;

function getRuntimeClient() {
	if (runtimeClient) return runtimeClient;
	const clientId = process.env.NEXUS_IGDB_CLIENT_ID?.trim() || 'r47r6x32icpyn4sqipc7wyjnjihz6y';
	const clientSecret = process.env.NEXUS_IGDB_CLIENT_SECRET?.trim() || 'i3t9tkwu66boa995gc593e4roefjrf';
	if (!clientId || !clientSecret) throw new IGDBCatalogError('not_configured');
	runtimeClient = createIGDBCatalogClient({clientId, clientSecret});
	return runtimeClient;
}

export function searchIGDBGames(query: string): Promise<Array<GamingEntry>> {
	return getRuntimeClient().search(query);
}
