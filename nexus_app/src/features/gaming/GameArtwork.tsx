// SPDX-License-Identifier: Nebula

import styles from '@app/features/gaming/GameArtwork.module.css';
import type {GamingEntry} from '@app/features/gaming/GamingTypes';
import {Trans} from '@lingui/react/macro';
import {useState} from 'react';

type GameArtworkVariant = 'portrait' | 'wide' | 'thumbnail';

interface GameArtworkProps {
	game: Pick<GamingEntry, 'name' | 'platform' | 'provider' | 'cover_url'>;
	variant?: GameArtworkVariant;
	showTitle?: boolean;
}

const POPULAR_COVERS: Record<string, string> = {
	'roblox': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20vo.webp',
	'rob': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20vo.webp',
	'rob run': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20vo.webp',
	'arc raiders': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co68cf.webp',
	'ea sports fc 27': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6g1r.webp',
	'ea sports fc 26': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6g1r.webp',
	'ea sports fc 25': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6g1r.webp',
	'ea sports fc 24': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6g1r.webp',
	'fifa': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6g1r.webp',
	'honkai: star rail': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co49wy.webp',
	'honkai star rail': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co49wy.webp',
	'grand theft auto v': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.webp',
	'grand theft auto v enhanced': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.webp',
	'gta v': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.webp',
	'gta 5': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.webp',
	'minecraft': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8fv5.webp',
	'counter-strike 2': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6b79.webp',
	'cs2': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6b79.webp',
	'counter strike': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6b79.webp',
	'valorant': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.webp',
	'league of legends': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4805.webp',
	'lol': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4805.webp',
	'fortnite': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u8v.webp',
	'call of duty': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co72f9.webp',
	'call of duty: black ops 6': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co72f9.webp',
	'apex legends': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20af.webp',
	'rocket league': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4a2m.webp',
	'genshin impact': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20au.webp',
	'wuthering waves': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co88h1.webp',
	'beamng.drive': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20au.webp',
	'pubg mobile': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co20av.webp',
	'helldivers 2': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7082.webp',
	'the finals': 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7083.webp',
};

function resolveCoverUrl(game: Pick<GamingEntry, 'name' | 'cover_url'>): string | null {
	if (game.cover_url) {
		return game.cover_url.startsWith('//') ? `https:${game.cover_url}` : game.cover_url;
	}
	const norm = game.name.trim().toLowerCase();
	if (POPULAR_COVERS[norm]) return POPULAR_COVERS[norm];
	for (const [key, url] of Object.entries(POPULAR_COVERS)) {
		if (norm.includes(key) || key.includes(norm)) return url;
	}
	return null;
}

export function GameArtwork({game, variant = 'portrait', showTitle = true}: GameArtworkProps) {
	const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
	const resolvedCover = resolveCoverUrl(game);
	const hasCover = Boolean(resolvedCover) && failedCoverUrl !== resolvedCover;

	return (
		<div className={`${styles.artwork} ${styles[variant]}`}>
			{hasCover ? (
				<img
					alt=""
					aria-hidden="true"
					className={styles.coverImage}
					decoding="async"
					loading="lazy"
					onError={() => setFailedCoverUrl(resolvedCover)}
					referrerPolicy="no-referrer"
					src={resolvedCover!}
				/>
			) : (
				<div className={styles.placeholder}>
					<svg aria-hidden="true" viewBox="0 0 48 48">
						<path
							d="M15.5 17h17a8 8 0 0 1 7.6 5.5l3 9.2a4.6 4.6 0 0 1-7.4 5l-5.1-4.2H17.4l-5.1 4.2a4.6 4.6 0 0 1-7.4-5l3-9.2a8 8 0 0 1 7.6-5.5Z"
							fill="none"
							stroke="currentColor"
							strokeLinejoin="round"
							strokeWidth="2.5"
						/>
						<path d="M16 23v8m-4-4h8m12-2h.1m5 4h.1" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
					</svg>
					<span>
						<Trans>Cover unavailable</Trans>
					</span>
				</div>
			)}
			{hasCover && <span className={styles.sourceMark}>IGDB</span>}
			{showTitle && (
				<div className={styles.title}>
					<strong>{game.name}</strong>
				</div>
			)}
		</div>
	);
}
