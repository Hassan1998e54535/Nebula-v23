// SPDX-License-Identifier: Nebula

import {fetchGuildGaming} from '@app/features/gaming/GamingClient';
import {GameArtwork} from '@app/features/gaming/GameArtwork';
import type {GuildGamingPlayer} from '@app/features/gaming/GamingTypes';
import styles from '@app/features/gaming/GamingActivityCard.module.css';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useState} from 'react';

interface GamingActivityCardProps {
	guildId?: string;
	userId: string;
}

export function GamingActivityCard({guildId, userId}: GamingActivityCardProps) {
	const {i18n} = useLingui();
	const [player, setPlayer] = useState<GuildGamingPlayer | null>(null);

	useEffect(() => {
		if (!guildId || !userId) {
			setPlayer(null);
			return;
		}

		let mounted = true;
		const load = async () => {
			try {
				const result = await fetchGuildGaming(guildId);
				if (mounted) setPlayer(result.players.find((entry) => entry.user_id === userId) ?? null);
			} catch {
				if (mounted) setPlayer(null);
			}
		};

		void load();
		const timer = window.setInterval(() => void load(), 30_000);
		return () => {
			mounted = false;
			window.clearInterval(timer);
		};
	}, [guildId, userId]);

	if (!player) return null;

	return (
		<section className={styles.card} aria-label={i18n._('Gaming Infinity activity')}>
			<div className={styles.artwork}>
				<GameArtwork game={player.game} variant="wide" showTitle={false} />
			</div>
			<div className={styles.details}>
				<div className={styles.liveLabel}>
					<span className={styles.liveDot} />
					<Trans>GAMING INFINITY · PLAYING NOW</Trans>
				</div>
				<strong className={styles.gameName}>{player.game.name}</strong>
				<span className={styles.platform}>
					{player.game.platform === 'computer' ? (
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
		</section>
	);
}
