// SPDX-License-Identifier: Nebula

import {GameArtwork} from '@app/features/gaming/GameArtwork';
import styles from '@app/features/gaming/GamingActivityCard.module.css';
import {useUserActiveGame} from '@app/features/gaming/useUserActiveGame';
import {Trans, useLingui} from '@lingui/react/macro';

interface GamingActivityCardProps {
	guildId?: string;
	userId: string;
	hideActiveGame?: boolean;
}

export function GamingActivityCard({guildId, userId, hideActiveGame = false}: GamingActivityCardProps) {
	const {i18n} = useLingui();
	const activeGame = useUserActiveGame(guildId, userId);

	const effectiveActiveGame = hideActiveGame ? null : activeGame;

	if (hideActiveGame || !effectiveActiveGame) {
		return null;
	}

	return (
		<div style={{display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0'}}>
			<section className={styles.card} aria-label={i18n._('Gaming Infinity activity')}>
				<div className={styles.artwork}>
					<GameArtwork game={effectiveActiveGame} variant="wide" showTitle={false} />
				</div>
				<div className={styles.details}>
					<div className={styles.liveLabel}>
						<span className={styles.liveDot} />
						<Trans>PLAYING NOW</Trans>
					</div>
					<strong className={styles.gameName}>{effectiveActiveGame.name}</strong>
					<span className={styles.platform}>
						{effectiveActiveGame.platform === 'computer' ? (
							<Trans>Computer</Trans>
						) : effectiveActiveGame.platform === 'mobile' ? (
							<Trans>Mobile</Trans>
						) : effectiveActiveGame.platform === 'console' ? (
							<Trans>Console</Trans>
						) : (
							<Trans>Other platform</Trans>
						)}
					</span>
				</div>
			</section>
		</div>
	);
}
