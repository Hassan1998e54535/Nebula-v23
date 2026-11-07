// SPDX-License-Identifier: Nebula

import {GameArtwork} from '@app/features/gaming/GameArtwork';
import {GAMING_INFINITY_CATALOG} from '@app/features/gaming/GamingCatalog';
import {GamingCatalogSearch} from '@app/features/gaming/GamingCatalogSearch';
import {fetchGuildGaming, saveGuildGaming, searchGuildGamingCatalog} from '@app/features/gaming/GamingClient';
import type {GamingEntry, GuildGaming} from '@app/features/gaming/GamingTypes';
import styles from '@app/features/guild/components/modals/guild_tabs/GuildGamesTab.module.css';
import Guilds from '@app/features/guild/state/Guilds';
import Users from '@app/features/user/state/Users';
import {Trans, useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

interface GuildGamesTabProps {
	guildId: string;
}

function entryId(name: string): string {
	return stripControlCharacters(name)
		.normalize('NFKC')
		.replace(/[‘’]/gu, "'")
		.replace(/[‐‑‒–—−]/gu, '-')
		.replace(/\s+/gu, ' ')
		.trim()
		.toLocaleLowerCase();
}

function stripControlCharacters(value: string): string {
	return Array.from(value)
		.filter((character) => {
			const codePoint = character.codePointAt(0)!;
			return codePoint > 0x1f && codePoint !== 0x7f;
		})
		.join('');
}

function GuildGamesTab({guildId}: GuildGamesTabProps) {
	const {i18n} = useLingui();
	const [data, setData] = useState<GuildGaming | null>(null);
	const [query, setQuery] = useState('');
	const [catalogQuery, setCatalogQuery] = useState('');
	const [catalogPlatform, setCatalogPlatform] = useState<'all' | GamingEntry['platform']>('all');
	const [customPlatform, setCustomPlatform] = useState<GamingEntry['platform']>('computer');
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [coverLookupStatus, setCoverLookupStatus] = useState<string | null>(null);
	const catalogSearchRef = useRef<HTMLInputElement>(null);
	const coverLookupStartedForGuild = useRef(new Set<string>());
	const latestDataRef = useRef(data);
	latestDataRef.current = data;
	const guild = Guilds.getGuild(guildId);
	const canManageGames = guild?.ownerId === Users.currentUser?.id;
	const hasLoadedData = data !== null;

	const refresh = useCallback(async () => {
		try {
			setData(await fetchGuildGaming(guildId));
			setError(null);
		} catch {
			setError(i18n._('Could not load this server’s games. Try again.'));
		}
	}, [guildId, i18n]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const result = await fetchGuildGaming(guildId);
				if (mounted) setData(result);
			} catch {
				if (mounted) setError(i18n._('Could not load this server’s games. Try again.'));
			}
		};
		void load();
		const timer = window.setInterval(() => void load(), 30_000);
		return () => {
			mounted = false;
			window.clearInterval(timer);
		};
	}, [guildId, i18n]);

	useEffect(() => {
		if (!canManageGames || !hasLoadedData || coverLookupStartedForGuild.current.has(guildId)) return;
		let active = true;
		const timer = window.setTimeout(() => {
			const initialData = latestDataRef.current;
			if (!active || !initialData || coverLookupStartedForGuild.current.has(guildId)) return;
			const missingGames = initialData.games.filter((game) => !(game.provider === 'igdb' && game.cover_url));
			if (missingGames.length === 0) {
				coverLookupStartedForGuild.current.add(guildId);
				return;
			}
			coverLookupStartedForGuild.current.add(guildId);
			const gamesToCheck = missingGames.slice(0, 5);
			const hasMoreMissing = missingGames.length > gamesToCheck.length;
			setCoverLookupStatus(i18n._('Checking game covers in IGDB…'));
			void (async () => {
				const results = await Promise.allSettled(
					gamesToCheck.map((game) => searchGuildGamingCatalog(guildId, game.name)),
				);
				const matches = new Map<string, GamingEntry>();
				let needsManualMatch = hasMoreMissing;

				results.forEach((result, index) => {
					if (result.status !== 'fulfilled') {
						needsManualMatch = true;
						return;
					}
					const match = result.value.find(
						(candidate) =>
							entryId(candidate.name) === entryId(gamesToCheck[index].name) && Boolean(candidate.cover_url),
					);
					if (match) matches.set(gamesToCheck[index].id, match);
					else needsManualMatch = true;
				});

				if (!active) return;
				if (matches.size === 0) {
					setCoverLookupStatus(needsManualMatch ? i18n._('Some game covers need a manual IGDB match.') : null);
					return;
				}

				const latestData = latestDataRef.current;
				if (!latestData) return;
				const enrichedGames = latestData.games.map((game) => {
					const match = matches.get(game.id);
					return match && !game.cover_url ? {...game, ...match, id: game.id} : game;
				});
				const didEnrich = enrichedGames.some((game, index) => game.cover_url !== latestData.games[index]?.cover_url);
				if (!didEnrich) {
					setCoverLookupStatus(i18n._('Some game covers need a manual IGDB match.'));
					return;
				}

				setBusy(true);
				try {
					const updated = await saveGuildGaming(guildId, enrichedGames);
					if (active) {
						setData(updated);
						setCoverLookupStatus(needsManualMatch ? i18n._('Some game covers need a manual IGDB match.') : null);
					}
				} catch {
					if (active) setCoverLookupStatus(i18n._('Some game covers need a manual IGDB match.'));
				} finally {
					if (active) setBusy(false);
				}
			})();
		}, 0);

		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [canManageGames, guildId, hasLoadedData, i18n]);

	const visiblePlayers = useMemo(() => {
		if (!data) return [];
		const normalizedQuery = query.trim().toLocaleLowerCase();
		return data.players.filter((player) => {
			if (selectedGameId && player.game.id !== selectedGameId) return false;
			const user = Users.users[player.user_id];
			const username = user?.username ?? '';
			return (
				!normalizedQuery ||
				player.game.name.toLocaleLowerCase().includes(normalizedQuery) ||
				username.toLocaleLowerCase().includes(normalizedQuery)
			);
		});
	}, [data, query, selectedGameId]);

	const catalogGames = useMemo(() => {
		const normalized = catalogQuery.trim().toLocaleLowerCase();
		return GAMING_INFINITY_CATALOG.filter(
			(game) =>
				(catalogPlatform === 'all' || game.platform === catalogPlatform) &&
				game.name.toLocaleLowerCase().includes(normalized) &&
				!data?.games.some((saved) => entryId(saved.name) === entryId(game.name)),
		);
	}, [catalogPlatform, catalogQuery, data?.games]);

	const saveGames = useCallback(
		async (games: Array<GamingEntry>) => {
			setBusy(true);
			setError(null);
			try {
				setData(await saveGuildGaming(guildId, games));
				setCatalogQuery('');
			} catch {
				setError(i18n._('Only this server’s owner can change its game list.'));
			} finally {
				setBusy(false);
			}
		},
		[guildId, i18n],
	);

	const addGame = useCallback(async () => {
		const name = stripControlCharacters(catalogQuery).trim();
		if (!name || !data) return;
		if (data.games.some((game) => entryId(game.name) === entryId(name))) {
			setError(i18n._('That game is already in this server’s list.'));
			return;
		}
		await saveGames([...data.games, {id: entryId(name), name, platform: customPlatform}]);
	}, [catalogQuery, customPlatform, data, i18n, saveGames]);

	const canAddCustomGame =
		data !== null &&
		catalogQuery.trim().length > 0 &&
		!data.games.some((game) => entryId(game.name) === entryId(catalogQuery)) &&
		!GAMING_INFINITY_CATALOG.some((game) => entryId(game.name) === entryId(catalogQuery));

	const findGameArtwork = useCallback((game: GamingEntry) => {
		setCatalogPlatform('all');
		setCatalogQuery(game.name);
		setError(null);
		catalogSearchRef.current?.focus();
		catalogSearchRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
	}, []);

	const addCatalogGame = useCallback(
		(game: GamingEntry) => {
			const currentGames = data?.games ?? [];
			const existingGame = currentGames.find((saved) => entryId(saved.name) === entryId(game.name));
			if (existingGame) {
				if (existingGame.cover_url || !game.cover_url) {
					setError(i18n._('That game is already in this server’s list.'));
					return;
				}
				void saveGames(
					currentGames.map((saved) => (saved.id === existingGame.id ? {...saved, ...game, id: saved.id} : saved)),
				);
				return;
			}
			void saveGames([...currentGames, game]);
		},
		[data?.games, i18n, saveGames],
	);

	if (!data) {
		return (
			<div className={styles.root} aria-live="polite">
				<p className={styles.muted}>
					<Trans>Loading Gaming Infinity…</Trans>
				</p>
				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className={styles.root}>
			<header className={styles.header}>
				<h2>
					<Trans>Gaming Infinity</Trans>
				</h2>
				<p className={styles.muted}>
					<Trans>
						Browse the games selected for this server and see members who chose to share what they are playing.
					</Trans>
				</p>
			</header>

			<section className={styles.panel} aria-labelledby="guild-game-list-heading">
				<h3 id="guild-game-list-heading">
					<Trans>Server game list</Trans>
				</h3>
				{coverLookupStatus && (
					<p className={styles.muted} role="status">
						{coverLookupStatus}
					</p>
				)}
				{data.games.length ? (
					<div className={styles.gameGrid}>
						{data.games.map((game) => (
							<article className={styles.serverGameCard} key={game.id}>
								<button
									aria-pressed={selectedGameId === game.id}
									className={styles.gameSelect}
									onClick={() => setSelectedGameId((current) => (current === game.id ? null : game.id))}
									type="button"
								>
									<GameArtwork game={game} showTitle={false} />
								</button>
								<button
									aria-pressed={selectedGameId === game.id}
									className={styles.gameSelect}
									onClick={() => setSelectedGameId((current) => (current === game.id ? null : game.id))}
									type="button"
								>
									<span className={styles.serverGameName}>{game.name}</span>
									<span className={styles.serverGamePlatform}>
										{game.platforms?.length ? (
											game.platforms.join(' · ')
										) : game.platform === 'computer' ? (
											<Trans>Computer</Trans>
										) : game.platform === 'mobile' ? (
											<Trans>Mobile</Trans>
										) : game.platform === 'console' ? (
											<Trans>Console</Trans>
										) : (
											<Trans>Other platform</Trans>
										)}
									</span>
								</button>
								{canManageGames && (
									<>
										{!(game.provider === 'igdb' && game.cover_url) && (
											<button
												className={styles.button}
												disabled={busy}
												onClick={() => findGameArtwork(game)}
												type="button"
											>
												<Trans>Find cover in IGDB</Trans>
											</button>
										)}
										<button
											className={styles.button}
											disabled={busy}
											onClick={() => void saveGames(data.games.filter((item) => item.id !== game.id))}
											type="button"
										>
											<Trans>Remove</Trans>
										</button>
									</>
								)}
							</article>
						))}
					</div>
				) : (
					<p className={styles.muted}>
						<Trans>No games have been added to this server yet.</Trans>
					</p>
				)}
			</section>
			{canManageGames && (
				<section className={styles.panel} aria-labelledby="guild-game-picks-heading">
					<div className={styles.sectionHeading}>
						<div>
							<h3 id="guild-game-picks-heading">
								<Trans>NEXUS quick picks</Trans>
							</h3>
							<p className={styles.muted}>
								<Trans>Quick picks are names only. Search IGDB and choose a match to add the real game cover.</Trans>
							</p>
						</div>
						<span className={styles.catalogMark}>
							<Trans>CURATED</Trans>
						</span>
					</div>
					<input
						aria-label={i18n._('Search IGDB and NEXUS quick picks')}
						className={styles.catalogSearch}
						onChange={(event) => setCatalogQuery(event.currentTarget.value)}
						placeholder={i18n._('Search IGDB for a game')}
						ref={catalogSearchRef}
						value={catalogQuery}
					/>
					<div className={styles.filters}>
						<label>
							<span className={styles.srOnly}>
								<Trans>Filter games by platform</Trans>
							</span>
							<select
								aria-label={i18n._('Filter games by platform')}
								onChange={(event) => setCatalogPlatform(event.currentTarget.value as 'all' | GamingEntry['platform'])}
								value={catalogPlatform}
							>
								<option value="all">{i18n._('All platforms')}</option>
								<option value="computer">{i18n._('Computer')}</option>
								<option value="console">{i18n._('Console')}</option>
								<option value="mobile">{i18n._('Mobile')}</option>
								<option value="other">{i18n._('Other platform')}</option>
							</select>
						</label>
					</div>
					<GamingCatalogSearch
						busy={busy}
						existingGames={data.games}
						guildId={guildId}
						onSelect={addCatalogGame}
						platform={catalogPlatform}
						query={catalogQuery}
					/>
					<div className={styles.catalogGrid}>
						{catalogGames.map((game) => (
							<article className={styles.catalogCard} key={game.id}>
								<div className={styles.catalogCardBody}>
									<strong className={styles.serverGameName}>{game.name}</strong>
									<span className={styles.serverGamePlatform}>
										{game.platforms?.length ? (
											game.platforms.join(' · ')
										) : game.platform === 'computer' ? (
											<Trans>Computer</Trans>
										) : game.platform === 'mobile' ? (
											<Trans>Mobile</Trans>
										) : game.platform === 'console' ? (
											<Trans>Console</Trans>
										) : (
											<Trans>Other platform</Trans>
										)}
									</span>
									<button
										className={`${styles.button} ${styles.buttonPrimary}`}
										disabled={busy}
										onClick={() => findGameArtwork(game)}
										type="button"
									>
										<Trans>Search IGDB cover</Trans>
									</button>
								</div>
							</article>
						))}
						{catalogGames.length === 0 && (
							<p className={`${styles.muted} ${styles.emptyState}`}>
								<Trans>No NEXUS quick picks match. Search IGDB or add a custom title by name.</Trans>
							</p>
						)}
					</div>
					{canAddCustomGame && (
						<div className={styles.addGame}>
							<label>
								<span className={styles.srOnly}>
									<Trans>Platform for this game</Trans>
								</span>
								<select
									aria-label={i18n._('Platform for this game')}
									onChange={(event) => setCustomPlatform(event.currentTarget.value as GamingEntry['platform'])}
									value={customPlatform}
								>
									<option value="computer">{i18n._('Computer')}</option>
									<option value="console">{i18n._('Console')}</option>
									<option value="mobile">{i18n._('Mobile')}</option>
									<option value="other">{i18n._('Other platform')}</option>
								</select>
							</label>
							<button
								className={`${styles.button} ${styles.buttonPrimary}`}
								disabled={busy}
								onClick={() => void addGame()}
								type="button"
							>
								<Trans>Add “{catalogQuery.trim()}” to server</Trans>
							</button>
						</div>
					)}
				</section>
			)}

			<section className={styles.panel} aria-labelledby="guild-active-players-heading">
				<h3 id="guild-active-players-heading">
					<Trans>Playing now ({visiblePlayers.length})</Trans>
				</h3>
				<div className={styles.filters}>
					<input
						aria-label={i18n._('Filter games and players')}
						onChange={(event) => setQuery(event.currentTarget.value)}
						placeholder={i18n._('Find a game or member')}
						value={query}
					/>
					<button className={styles.button} onClick={() => void refresh()} type="button">
						<Trans>Refresh</Trans>
					</button>
					{selectedGameId && (
						<button className={styles.button} onClick={() => setSelectedGameId(null)} type="button">
							<Trans>Clear game filter</Trans>
						</button>
					)}
				</div>
				{visiblePlayers.length ? (
					<div className={styles.playerList}>
						{visiblePlayers.map((player) => {
							const user = Users.users[player.user_id];
							return (
								<div className={styles.playerRow} key={player.user_id}>
									<GameArtwork game={player.game} variant="thumbnail" />
									<div className={styles.playerInfo}>
										<span className={styles.playerName}>{user?.username ?? i18n._('Member')}</span>
										<span className={styles.muted}>{player.game.name}</span>
									</div>
									<span className={styles.muted}>
										{player.game.platforms?.length ? (
											player.game.platforms.join(' · ')
										) : player.game.platform === 'computer' ? (
											<Trans>Computer</Trans>
										) : player.game.platform === 'mobile' ? (
											<Trans>Mobile</Trans>
										) : player.game.platform === 'console' ? (
											<Trans>Console</Trans>
										) : (
											<Trans>Other platform</Trans>
										)}
									</span>
								</div>
							);
						})}
					</div>
				) : (
					<p className={styles.muted}>
						<Trans>No one is sharing game activity right now.</Trans>
					</p>
				)}
			</section>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

export default observer(GuildGamesTab);
