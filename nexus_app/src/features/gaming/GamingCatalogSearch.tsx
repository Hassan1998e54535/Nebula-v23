// SPDX-License-Identifier: Nebula

import {GameArtwork} from '@app/features/gaming/GameArtwork';
import styles from '@app/features/gaming/GamingCatalogSearch.module.css';
import {searchGuildGamingCatalog} from '@app/features/gaming/GamingClient';
import type {GamingEntry, GamingPlatform} from '@app/features/gaming/GamingTypes';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useMemo, useState} from 'react';

interface GamingCatalogSearchProps {
	guildId: string;
	query: string;
	platform: 'all' | GamingPlatform;
	existingGames: Array<GamingEntry>;
	busy: boolean;
	onSelect: (game: GamingEntry) => void;
}

function normalizedName(value: string): string {
	return value
		.normalize('NFKC')
		.replace(/[‘’]/gu, "'")
		.replace(/[‐‑‒–—−]/gu, '-')
		.replace(/\s+/gu, ' ')
		.trim()
		.toLocaleLowerCase();
}

export function GamingCatalogSearch({
	guildId,
	query,
	platform,
	existingGames,
	busy,
	onSelect,
}: GamingCatalogSearchProps) {
	const {i18n} = useLingui();
	const [results, setResults] = useState<Array<GamingEntry>>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const normalizedQuery = query.trim();

	useEffect(() => {
		if (normalizedQuery.length < 2) {
			setResults([]);
			setLoading(false);
			setError(false);
			return;
		}

		let active = true;
		setLoading(true);
		setError(false);
		const timer = window.setTimeout(() => {
			void searchGuildGamingCatalog(guildId, normalizedQuery)
				.then((games) => {
					if (active) setResults(games);
				})
				.catch(() => {
					if (active) {
						setResults([]);
						setError(true);
					}
				})
				.finally(() => {
					if (active) setLoading(false);
				});
		}, 400);

		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [guildId, normalizedQuery]);

	const visibleResults = useMemo(
		() => results.filter((game) => platform === 'all' || game.platform === platform),
		[platform, results],
	);
	const existingGamesByName = useMemo(
		() => new Map(existingGames.map((game) => [normalizedName(game.name), game])),
		[existingGames],
	);

	if (normalizedQuery.length < 2) return null;

	return (
		<section className={styles.root} aria-label={i18n._('IGDB game search results')}>
			<div className={styles.heading}>
				<h4>
					<Trans>More games from IGDB</Trans>
				</h4>
				<a href="https://www.igdb.com/" rel="noreferrer noopener" target="_blank">
					<Trans>Game data and cover art by IGDB</Trans>
				</a>
			</div>

			{loading && (
				<p className={styles.status} role="status">
					<Trans>Searching IGDB…</Trans>
				</p>
			)}
			{error && (
				<p className={styles.error} role="alert">
					<Trans>IGDB search is temporarily unavailable.</Trans>
				</p>
			)}
			{!loading && !error && visibleResults.length === 0 && (
				<p className={styles.status}>
					<Trans>No IGDB matches. You can add a custom title below.</Trans>
				</p>
			)}
			{visibleResults.length > 0 && (
				<div className={styles.grid}>
					{visibleResults.map((game) => {
						const existingGame = existingGamesByName.get(normalizedName(game.name));
						const canAddCover = Boolean(existingGame && game.cover_url && !existingGame.cover_url);
						const alreadyAdded = Boolean(existingGame && !canAddCover);
						return (
							<article className={styles.card} key={game.id}>
								<GameArtwork game={game} showTitle={false} />
								<div className={styles.cardBody}>
									<strong>{game.name}</strong>
									<span className={styles.platform}>
										{game.platforms?.length ? game.platforms.join(' · ') : <Trans>Platform not listed</Trans>}
									</span>
									{game.source_url && (
										<a href={game.source_url} rel="noreferrer noopener" target="_blank">
											<Trans>View IGDB source</Trans>
										</a>
									)}
									<button
										className={styles.addButton}
										disabled={busy || alreadyAdded}
										onClick={() => onSelect(game)}
										type="button"
									>
										{existingGame ? (
											canAddCover ? (
												<Trans>Add IGDB cover</Trans>
											) : game.cover_url ? (
												<Trans>Already added</Trans>
											) : (
												<Trans>No cover available</Trans>
											)
										) : (
											<Trans>Add from IGDB</Trans>
										)}
									</button>
								</div>
							</article>
						);
					})}
				</div>
			)}
		</section>
	);
}
