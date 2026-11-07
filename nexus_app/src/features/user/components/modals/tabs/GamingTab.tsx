// SPDX-License-Identifier: Nebula

import {GameArtwork} from '@app/features/gaming/GameArtwork';
import {GAMING_INFINITY_CATALOG} from '@app/features/gaming/GamingCatalog';
import {
	fetchGamingProfile,
	saveGamingProfile,
	startGamingActivity,
	stopGamingActivity,
} from '@app/features/gaming/GamingClient';
import {
	clearStoredGamingActivity,
	type GamingDetectionPreferences,
	getGamingDetectionPreferences,
	removeGamingProcessRegistration,
	saveGamingDetectionPreferences,
	storeGamingActivity,
	suppressGamingProcessForGame,
} from '@app/features/gaming/GamingPresenceHeartbeat';
import type {GamingEntry, GamingProfile} from '@app/features/gaming/GamingTypes';
import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import styles from '@app/features/user/components/modals/tabs/GamingTab.module.css';
import Users from '@app/features/user/state/Users';
import {Trans, useLingui} from '@lingui/react/macro';
import {GameControllerIcon} from '@phosphor-icons/react';
import {useCallback, useEffect, useMemo, useState} from 'react';

function stripControlCharacters(value: string): string {
	return Array.from(value)
		.filter((character) => {
			const codePoint = character.codePointAt(0)!;
			return codePoint > 0x1f && codePoint !== 0x7f;
		})
		.join('');
}

function gameId(name: string): string {
	return stripControlCharacters(name).normalize('NFKC').trim().toLocaleLowerCase();
}

function GamingTab() {
	const {i18n} = useLingui();
	const userId = Users.currentUserId ?? '';
	const nativeApi = getElectronAPI();
	const [profile, setProfile] = useState<GamingProfile | null>(null);
	const [query, setQuery] = useState('');
	const [platform, setPlatform] = useState<GamingEntry['platform']>('computer');
	const [catalogPlatform, setCatalogPlatform] = useState<'all' | GamingEntry['platform']>('all');
	const [detectionPreferences, setDetectionPreferences] = useState<GamingDetectionPreferences>({
		enabled: false,
		registrations: [],
		suppressed_process_names: [],
		suppressed_game_ids: [],
		suppressed_game_names: [],
	});
	const [runningProcesses, setRunningProcesses] = useState<Array<string>>([]);
	const [processSearch, setProcessSearch] = useState('');
	const [selectedProcess, setSelectedProcess] = useState('');
	const [selectedGameId, setSelectedGameId] = useState('');
	const [loadingProcesses, setLoadingProcesses] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		setDetectionPreferences(getGamingDetectionPreferences(userId));
		void fetchGamingProfile()
			.then((next) => {
				if (mounted) setProfile(next);
			})
			.catch(() => {
				if (mounted) setError(i18n._('Could not load your gaming profile. Please try again.'));
			});
		return () => {
			mounted = false;
		};
	}, [i18n, userId]);

	const filteredGames = useMemo(() => {
		const normalized = query.trim().toLocaleLowerCase();
		return (profile?.games ?? []).filter((game) => !normalized || game.name.toLocaleLowerCase().includes(normalized));
	}, [profile?.games, query]);

	const catalogGames = useMemo(() => {
		const normalized = query.trim().toLocaleLowerCase();
		return GAMING_INFINITY_CATALOG.filter(
			(game) =>
				(catalogPlatform === 'all' || game.platform === catalogPlatform) &&
				game.name.toLocaleLowerCase().includes(normalized) &&
				!profile?.games.some((saved) => gameId(saved.name) === gameId(game.name)),
		);
	}, [catalogPlatform, profile?.games, query]);

	const persistProfile = useCallback(
		async (games: Array<GamingEntry>, shareWithGuilds: boolean) => {
			setBusy(true);
			setError(null);
			try {
				const next = await saveGamingProfile(games, shareWithGuilds);
				setProfile(next);
				if (next.activity) {
					storeGamingActivity(
						userId,
						next.activity.game,
						shareWithGuilds,
						next.activity.started_at,
					);
				}
			} catch {
				setError(i18n._('Could not save your gaming settings. Please try again.'));
			} finally {
				setBusy(false);
			}
		},
		[i18n, userId],
	);

	const startGame = useCallback(
		async (game: GamingEntry) => {
			if (!profile) return;
			setBusy(true);
			setError(null);
			try {
				const next = await startGamingActivity(game, profile.share_with_guilds);
				setProfile(next);
				storeGamingActivity(userId, game, profile.share_with_guilds, next.activity?.started_at ?? new Date().toISOString());
			} catch {
				setError(i18n._('Could not start sharing this game. Please try again.'));
			} finally {
				setBusy(false);
			}
		},
		[i18n, profile, userId],
	);

	const addGame = useCallback(
		async (playImmediately: boolean) => {
			const name = stripControlCharacters(query).trim();
			if (!name || !profile) return;
			const existing = profile.games.find((game) => gameId(game.name) === gameId(name));
			if (existing) {
				if (playImmediately) await startGame(existing);
				return;
			}
			const game: GamingEntry = {id: gameId(name), name, platform};
			const nextGames = [...profile.games, game];
			setBusy(true);
			setError(null);
			try {
				const next = await saveGamingProfile(nextGames, profile.share_with_guilds);
				setProfile(next);
				setQuery('');
				if (playImmediately) {
					const active = await startGamingActivity(game, next.share_with_guilds);
					setProfile(active);
					storeGamingActivity(
						userId,
						game,
						next.share_with_guilds,
						active.activity?.started_at ?? new Date().toISOString(),
					);
				}
			} catch {
				setError(i18n._('Could not add this game. Please try again.'));
			} finally {
				setBusy(false);
			}
		},
		[i18n, platform, profile, query, startGame, userId],
	);

	const addCatalogGame = useCallback(
		async (game: GamingEntry) => {
			if (!profile) return;
			const existing = profile.games.find((entry) => gameId(entry.name) === gameId(game.name));
			if (existing) {
				await startGame(existing);
				return;
			}

			setBusy(true);
			setError(null);
			try {
				const saved = await saveGamingProfile([...profile.games, game], profile.share_with_guilds);
				setProfile(saved);
				const active = await startGamingActivity(game, saved.share_with_guilds);
				setProfile(active);
				storeGamingActivity(
					userId,
					game,
					active.share_with_guilds,
					active.activity?.started_at ?? new Date().toISOString(),
				);
			} catch {
				setError(i18n._('Could not add this game. Please try again.'));
			} finally {
				setBusy(false);
			}
		},
		[i18n, profile, startGame, userId],
	);

	const stopGame = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const stoppedGame = profile?.activity?.game;
			const next = await stopGamingActivity();
			setProfile(next);
			clearStoredGamingActivity(userId);
			if (stoppedGame && detectionPreferences.enabled) {
				if (suppressGamingProcessForGame(userId, stoppedGame.id, stoppedGame.name)) {
					setDetectionPreferences(getGamingDetectionPreferences(userId));
				} else {
					setError(i18n._('Could not save local game detection settings.'));
				}
			}
		} catch {
			setError(i18n._('Could not stop game activity. Please try again.'));
		} finally {
			setBusy(false);
		}
	}, [detectionPreferences.enabled, i18n, profile?.activity, userId]);

	const setAutomaticDetection = useCallback(
		(enabled: boolean) => {
			const next = {...detectionPreferences, enabled};
			if (saveGamingDetectionPreferences(userId, next)) {
				setDetectionPreferences(next);
			} else {
				setError(i18n._('Could not save local game detection settings.'));
			}
		},
		[detectionPreferences, i18n, userId],
	);

	const refreshRunningProcesses = useCallback(async () => {
		if (!nativeApi?.getRunningGameProcessNames) return;
		setLoadingProcesses(true);
		setError(null);
		try {
			const processNames = await nativeApi.getRunningGameProcessNames();
			setRunningProcesses(processNames);
			setSelectedProcess((current) =>
				current && processNames.includes(current) ? current : (processNames[0] ?? ''),
			);
		} catch {
			setError(i18n._('Could not read running apps on this device.'));
		} finally {
			setLoadingProcesses(false);
		}
	}, [i18n, nativeApi]);

	const registerGameProcess = useCallback(() => {
		const game = profile?.games.find((entry) => entry.id === selectedGameId);
		if (!game || !selectedProcess) return;
		const next: GamingDetectionPreferences = {
			...detectionPreferences,
			registrations: [
				...detectionPreferences.registrations.filter(
					(registration) =>
						registration.game.id !== game.id && registration.process_name !== selectedProcess,
				),
				{game, process_name: selectedProcess},
			],
		};
		if (saveGamingDetectionPreferences(userId, next)) {
			setDetectionPreferences(next);
		} else {
			setError(i18n._('Could not save local game detection settings.'));
		}
	}, [detectionPreferences, i18n, profile?.games, selectedGameId, selectedProcess, userId]);

	const removeGameProcess = useCallback(
		(gameIdToRemove: string): boolean => {
			if (!detectionPreferences.registrations.some((registration) => registration.game.id === gameIdToRemove)) {
				return true;
			}
			if (removeGamingProcessRegistration(userId, gameIdToRemove)) {
				setDetectionPreferences(getGamingDetectionPreferences(userId));
				return true;
			} else {
				setError(i18n._('Could not save local game detection settings.'));
				return false;
			}
		},
		[detectionPreferences.registrations, i18n, userId],
	);

	const removeGame = useCallback(
		async (game: GamingEntry) => {
			if (!profile || profile.activity?.game.id === game.id) return;
			if (!removeGameProcess(game.id)) return;
			await persistProfile(
				profile.games.filter((entry) => entry.id !== game.id),
				profile.share_with_guilds,
			);
		},
		[persistProfile, profile, removeGameProcess],
	);

	if (!profile) {
		return (
			<div className={styles.root} aria-live="polite">
				<p className={styles.muted}>
					<Trans>Loading Gaming Infinity…</Trans>
				</p>
				{error && <p className={styles.error}>{error}</p>}
			</div>
		);
	}

	return (
		<div className={styles.root}>
			<header className={styles.intro}>
				<h2>
					<GameControllerIcon aria-hidden="true" size={22} /> <Trans>Gaming Infinity</Trans>
				</h2>
				<p className={styles.muted}>
					<Trans>Add any game by name, then start or stop sharing it with one tap.</Trans>
				</p>
			</header>

			<section className={styles.card} aria-labelledby="gaming-activity-heading">
				<h3 id="gaming-activity-heading">
					<Trans>Current activity</Trans>
				</h3>
				{profile.activity ? (
					<div className={styles.currentActivity}>
						<div className={styles.currentArtwork}>
							<GameArtwork game={profile.activity.game} variant="wide" />
						</div>
						<div className={styles.currentDetails}>
							<strong className={styles.gameName}>{profile.activity.game.name}</strong>
							<span className={styles.muted}>
								{profile.activity.game.platform === 'computer' ? (
									<Trans>Computer</Trans>
								) : profile.activity.game.platform === 'mobile' ? (
									<Trans>Mobile</Trans>
								) : profile.activity.game.platform === 'console' ? (
									<Trans>Console</Trans>
								) : (
									<Trans>Other platform</Trans>
								)}
							</span>
						</div>
						<button className={`${styles.button} ${styles.buttonSecondary}`} disabled={busy} onClick={stopGame} type="button">
							<Trans>Stop activity</Trans>
						</button>
					</div>
				) : (
					<p className={styles.muted}>
						<Trans>You are not sharing a game right now.</Trans>
					</p>
				)}
			</section>

			<section className={styles.card} aria-labelledby="gaming-privacy-heading">
				<h3 id="gaming-privacy-heading">
					<Trans>Activity privacy</Trans>
				</h3>
				<label className={styles.privacy}>
					<input
						checked={profile.share_with_guilds}
						disabled={busy}
						onChange={(event) => void persistProfile(profile.games, event.currentTarget.checked)}
						type="checkbox"
					/>
					<span>
						<strong>
							<Trans>Share my game activity in servers</Trans>
						</strong>
						<br />
						<span className={styles.muted}>
							<Trans>Off by default. Only currently active games are shared, and you can stop at any time.</Trans>
						</span>
					</span>
				</label>
			</section>

			<section className={styles.card} aria-labelledby="gaming-detection-heading">
				<h3 id="gaming-detection-heading">
					<Trans>Automatic game detection</Trans>
				</h3>
				{nativeApi?.getRunningGameProcessNames ? (
					<>
						<label className={styles.privacy}>
							<input
								checked={detectionPreferences.enabled}
								onChange={(event) => setAutomaticDetection(event.currentTarget.checked)}
								type="checkbox"
							/>
							<span>
								<strong>
									<Trans>Detect games on this computer</Trans>
								</strong>
								<br />
								<span className={styles.muted}>
									<Trans>
										Optional and off by default. While enabled, NEXUS checks running app paths and Steam library details
										on this computer only. File paths and library details are never uploaded. Only the game title and
										activity status are sent to NEXUS; sharing settings control who can see them.
									</Trans>
								</span>
							</span>
						</label>
						<p className={styles.muted}>
							<Trans>
								Steam games are identified automatically on Windows and for native Linux installs. You can link a
								running app manually for non-Steam games or unsupported platforms.
							</Trans>
						</p>
						<div className={styles.search}>
							<button
								className={styles.button}
								disabled={loadingProcesses}
								onClick={() => void refreshRunningProcesses()}
								type="button"
							>
								{loadingProcesses ? <Trans>Scanning apps…</Trans> : <Trans>Find running apps</Trans>}
							</button>
							<select
								aria-label={i18n._('Game to link')}
								className={styles.platform}
								onChange={(event) => setSelectedGameId(event.currentTarget.value)}
								value={selectedGameId}
							>
								<option value="">{i18n._('Choose a game from your library')}</option>
								{profile.games.map((game) => (
									<option key={game.id} value={game.id}>
										{game.name}
									</option>
								))}
							</select>
							<input
								aria-label={i18n._('Filter running apps')}
								onChange={(event) => setProcessSearch(event.currentTarget.value)}
								placeholder={i18n._('Filter running apps')}
								value={processSearch}
							/>
							<select
								aria-label={i18n._('Running app')}
								className={styles.platform}
								onChange={(event) => setSelectedProcess(event.currentTarget.value)}
								value={selectedProcess}
							>
								{runningProcesses
									.filter((name) => name.toLocaleLowerCase().includes(processSearch.trim().toLocaleLowerCase()))
									.map((name) => (
										<option key={name} value={name}>
											{name}
										</option>
									))}
							</select>
							<button
								className={styles.button}
								disabled={!selectedGameId || !selectedProcess}
								onClick={registerGameProcess}
								type="button"
							>
								<Trans>Link a non-Steam game</Trans>
							</button>
						</div>
						{runningProcesses.length === 0 && (
							<p className={styles.muted}>
								<Trans>Start a game, then select Find running apps.</Trans>
							</p>
						)}
						{detectionPreferences.registrations.map((registration) => (
							<div className={styles.processRegistration} key={`${registration.game.id}:${registration.process_name}`}>
								<span>
									<strong>{registration.game.name}</strong>
									<span className={styles.muted}> · {registration.process_name}</span>
								</span>
								<button
									aria-label={i18n._('Remove app link for {game}', {game: registration.game.name})}
									className={`${styles.button} ${styles.buttonSecondary}`}
									onClick={() => removeGameProcess(registration.game.id)}
									type="button"
								>
									<Trans>Remove</Trans>
								</button>
							</div>
						))}
					</>
				) : (
					<p className={styles.muted}>
						<Trans>
							Automatic detection is available in the NEXUS desktop app. On mobile, start activity manually; your
							profile can still show activity started on desktop.
						</Trans>
					</p>
				)}
			</section>

			<section className={styles.card} aria-labelledby="gaming-library-heading">
				<div className={styles.sectionHeading}>
					<div>
						<h3 id="gaming-library-heading"><Trans>My game library</Trans></h3>
						<p className={styles.muted}><Trans>Your games, ready to launch in Gaming Infinity.</Trans></p>
					</div>
					<span className={styles.countPill}>{profile.games.length}</span>
				</div>
				<div className={styles.search}>
					<input
						aria-label={i18n._('Search or add any game')}
						onChange={(event) => setQuery(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') void addGame(true);
						}}
						placeholder={i18n._('Type a game title')}
						value={query}
					/>
					<select
						aria-label={i18n._('Platform')}
						className={styles.platform}
						onChange={(event) => setPlatform(event.currentTarget.value as GamingEntry['platform'])}
						value={platform}
					>
						<option value="computer">{i18n._('Computer')}</option>
						<option value="mobile">{i18n._('Mobile')}</option>
						<option value="console">{i18n._('Console')}</option>
						<option value="other">{i18n._('Other platform')}</option>
					</select>
					<button className={styles.button} disabled={busy || !query.trim()} onClick={() => void addGame(true)} type="button">
						<Trans>Add &amp; play</Trans>
					</button>
				</div>
				{query.trim() && !profile.games.some((game) => gameId(game.name) === gameId(query)) && (
					<p className={styles.muted}>
						<Trans>Any title can be added, even if it is not in a catalog.</Trans>
					</p>
				)}
				<div className={styles.libraryGrid}>
					{filteredGames.map((game) => (
						<article className={styles.gameCard} key={game.id}>
							<GameArtwork game={game} />
							<div className={styles.gameCardBody}>
								<div className={styles.gameCardText}>
									<strong className={styles.gameName}>{game.name}</strong>
									<span className={styles.muted}>
										{game.platform === 'computer' ? (
											<Trans>Computer</Trans>
										) : game.platform === 'mobile' ? (
											<Trans>Mobile</Trans>
										) : game.platform === 'console' ? (
											<Trans>Console</Trans>
										) : (
											<Trans>Other platform</Trans>
										)}
									</span>
								</div>
								<div className={styles.gameActions}>
									<button
										className={styles.button}
										disabled={busy || profile.activity?.game.id === game.id}
										onClick={() => void startGame(game)}
										type="button"
									>
										{profile.activity?.game.id === game.id ? <Trans>Playing</Trans> : <Trans>Play now</Trans>}
									</button>
									<button
										aria-label={i18n._('Remove {game}', {game: game.name})}
										className={`${styles.button} ${styles.buttonSecondary}`}
										disabled={busy || profile.activity?.game.id === game.id}
										onClick={() => void removeGame(game)}
										type="button"
									>
										<Trans>Remove</Trans>
									</button>
								</div>
							</div>
						</article>
					))}
					{filteredGames.length === 0 && (
						<p className={`${styles.muted} ${styles.emptyState}`}>
							<Trans>No games saved yet. Type a title above to add it.</Trans>
						</p>
					)}
				</div>
			</section>
			<section className={styles.catalogSection} aria-labelledby="gaming-discover-heading">
				<div className={styles.sectionHeading}>
					<div>
						<h3 id="gaming-discover-heading"><Trans>Discover games</Trans></h3>
						<p className={styles.muted}><Trans>Browse curated picks or search for any title.</Trans></p>
					</div>
					<span className={styles.catalogMark}><Trans>NEXUS PICKS</Trans></span>
				</div>
			<div className={styles.platformFilters} aria-label={i18n._('Filter games by platform')} role="group">
					{(['all', 'computer', 'mobile', 'console', 'other'] as const).map((filter) => (
						<button
							aria-pressed={catalogPlatform === filter}
							className={styles.filterChip}
							key={filter}
							onClick={() => setCatalogPlatform(filter)}
							type="button"
						>
							{filter === 'all' ? (
								<Trans>All platforms</Trans>
							) : filter === 'computer' ? (
								<Trans>Computer</Trans>
							) : filter === 'mobile' ? (
								<Trans>Mobile</Trans>
							) : filter === 'console' ? (
								<Trans>Console</Trans>
							) : (
								<Trans>Other platform</Trans>
							)}
						</button>
					))}
				</div>
				<div className={styles.catalogGrid}>
					{catalogGames.map((game) => (
						<article className={styles.catalogCard} key={game.id}>
							<GameArtwork game={game} />
							<div className={styles.catalogCardBody}>
								<strong className={styles.gameName}>{game.name}</strong>
								<span className={styles.muted}>
									{game.platform === 'mobile' ? <Trans>Mobile</Trans> : <Trans>Computer</Trans>}
								</span>
								<button className={styles.button} disabled={busy} onClick={() => void addCatalogGame(game)} type="button">
									<Trans>Add &amp; play</Trans>
								</button>
							</div>
						</article>
					))}
					{catalogGames.length === 0 && (
						<p className={`${styles.muted} ${styles.emptyState}`}>
							<Trans>No more matching picks. Add your own title above.</Trans>
						</p>
					)}
				</div>
			</section>
			{error && <p className={styles.error} role="alert">{error}</p>}
		</div>
	);
}

export default GamingTab;
