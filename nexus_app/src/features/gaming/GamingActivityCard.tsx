// SPDX-License-Identifier: Nebula

import {fetchGamingProfile} from '@app/features/gaming/GamingClient';
import {GameArtwork} from '@app/features/gaming/GameArtwork';
import type {GamingProfile} from '@app/features/gaming/GamingTypes';
import {useUserActiveGame} from '@app/features/gaming/useUserActiveGame';
import Authentication from '@app/features/auth/state/Authentication';
import styles from '@app/features/gaming/GamingActivityCard.module.css';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useState} from 'react';

interface GamingActivityCardProps {
	guildId?: string;
	userId: string;
}

export function GamingActivityCard({guildId, userId}: GamingActivityCardProps) {
	const {i18n} = useLingui();
	const activeGame = useUserActiveGame(guildId, userId);
	const isCurrentUser = Boolean(userId && Authentication.currentUserId && userId === Authentication.currentUserId);
	const [profile, setProfile] = useState<GamingProfile | null>(null);

	useEffect(() => {
		if (!userId) return;
		let mounted = true;
		if (isCurrentUser) {
			void fetchGamingProfile()
				.then((data) => {
					if (mounted) setProfile(data);
				})
				.catch(() => undefined);
		}
		return () => {
			mounted = false;
		};
	}, [userId, isCurrentUser]);

	if (!activeGame && (!profile?.games || profile.games.length === 0)) {
		return null;
	}

	return (
		<div style={{display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0'}}>
			{profile && profile.games.length > 0 && (
				<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px'}}>
					<span style={{fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)'}}>
						<Trans>Game Collection</Trans>
					</span>
					<div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
						{profile.games.slice(0, 4).map((g) => (
							<div key={g.id} style={{width: 24, height: 24, borderRadius: 6, overflow: 'hidden'}} title={g.name}>
								<GameArtwork game={g} variant="compact" showTitle={false} />
							</div>
						))}
						{profile.games.length > 4 && (
							<span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>
								+{profile.games.length - 4}
							</span>
						)}
					</div>
				</div>
			)}
			{activeGame && (
				<section className={styles.card} aria-label={i18n._('Gaming Infinity activity')}>
					<div className={styles.artwork}>
						<GameArtwork game={activeGame} variant="wide" showTitle={false} />
					</div>
					<div className={styles.details}>
						<div className={styles.liveLabel}>
							<span className={styles.liveDot} />
							<Trans>PLAYING NOW</Trans>
						</div>
						<strong className={styles.gameName}>{activeGame.name}</strong>
						<span className={styles.platform}>
							{activeGame.platform === 'computer' ? (
								<Trans>Computer</Trans>
							) : activeGame.platform === 'mobile' ? (
								<Trans>Mobile</Trans>
							) : activeGame.platform === 'console' ? (
								<Trans>Console</Trans>
							) : (
								<Trans>Other platform</Trans>
							)}
						</span>
					</div>
				</section>
			)}
		</div>
	);
}
