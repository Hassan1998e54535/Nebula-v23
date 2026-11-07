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

export function GameArtwork({game, variant = 'portrait', showTitle = true}: GameArtworkProps) {
	const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
	const hasCover = game.provider === 'igdb' && Boolean(game.cover_url) && failedCoverUrl !== game.cover_url;

	return (
		<div className={`${styles.artwork} ${styles[variant]}`}>
			{hasCover ? (
				<img
					alt=""
					aria-hidden="true"
					className={styles.coverImage}
					decoding="async"
					loading="lazy"
					onError={() => setFailedCoverUrl(game.cover_url ?? null)}
					referrerPolicy="no-referrer"
					src={game.cover_url!}
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
