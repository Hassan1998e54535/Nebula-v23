// SPDX-License-Identifier: Nebula

import {fetchGamingProfile, saveGamingProfile} from '@app/features/gaming/GamingClient';
import {
	type GamingDetectionPreferences,
	getGamingDetectionPreferences,
	saveGamingDetectionPreferences,
	storeGamingActivity,
} from '@app/features/gaming/GamingPresenceHeartbeat';
import type {GamingProfile} from '@app/features/gaming/GamingTypes';
import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import styles from '@app/features/user/components/modals/tabs/GamingTab.module.css';
import Users from '@app/features/user/state/Users';
import {Trans, useLingui} from '@lingui/react/macro';
import {GameControllerIcon} from '@phosphor-icons/react';
import {useCallback, useEffect, useState} from 'react';

function GamingTab() {
	const {i18n} = useLingui();
	const userId = Users.currentUserId ?? '';
	const nativeApi = getElectronAPI();
	const [profile, setProfile] = useState<GamingProfile | null>(null);
	const [detectionPreferences, setDetectionPreferences] = useState<GamingDetectionPreferences>({
		enabled: false,
		registrations: [],
		suppressed_process_names: [],
		suppressed_game_ids: [],
		suppressed_game_names: [],
	});
	const [loading, setLoading] = useState(true);
	const [savingShare, setSavingShare] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		setDetectionPreferences(getGamingDetectionPreferences(userId));
		void fetchGamingProfile()
			.then((next) => {
				if (mounted) setProfile(next);
			})
			.catch(() => {
				if (mounted) setError(i18n._('Could not load your gaming settings. Please try again.'));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [i18n, userId]);

	const setAutomaticDetection = useCallback(
		(enabled: boolean) => {
			const next = {...detectionPreferences, enabled};
			if (saveGamingDetectionPreferences(userId, next)) {
				setDetectionPreferences(next);
				setError(null);
			} else {
				setError(i18n._('Could not save local game detection settings.'));
			}
		},
		[detectionPreferences, i18n, userId],
	);

	const setActivitySharing = useCallback(
		async (shareWithGuilds: boolean) => {
			if (!profile || savingShare) return;
			setSavingShare(true);
			setError(null);
			try {
				const next = await saveGamingProfile(profile.games, shareWithGuilds);
				setProfile(next);
				if (next.activity) {
					storeGamingActivity(userId, next.activity.game, shareWithGuilds, next.activity.started_at);
				}
			} catch {
				setError(i18n._('Could not save your gaming settings. Please try again.'));
			} finally {
				setSavingShare(false);
			}
		},
		[i18n, profile, savingShare, userId],
	);

	if (loading) {
		return (
			<div className={styles.root} aria-live="polite">
				<p className={styles.muted}>
					<Trans>Loading game detection settings…</Trans>
				</p>
			</div>
		);
	}

	return (
		<div className={styles.root}>
			<header className={styles.intro}>
				<div className={styles.eyebrow}>
					<Trans>NEXUS · ACTIVITY</Trans>
				</div>
				<h2>
					<GameControllerIcon aria-hidden="true" size={23} />
					<Trans>Game detection</Trans>
				</h2>
				<p className={styles.muted}>
					<Trans>Choose whether NEXUS detects games on this computer and shows your activity on your profile.</Trans>
				</p>
			</header>

			<main className={styles.controls}>
				<section className={styles.settingRow} aria-labelledby="game-detection-title">
					<div className={styles.settingIcon} aria-hidden="true">
						<GameControllerIcon size={22} />
					</div>
					<div className={styles.settingCopy}>
						<h3 id="game-detection-title">
							<Trans>Detect and show games</Trans>
						</h3>
						<p className={styles.muted}>
							<Trans>
								When enabled, NEXUS checks for supported games locally and displays the game you are playing on your
								profile. Turn it off to stop automatic detection and remove automatic game activity.
							</Trans>
						</p>
					</div>
					<label className={styles.switch} aria-label={i18n._('Detect and show games')}>
						<input
							checked={detectionPreferences.enabled}
							onChange={(event) => setAutomaticDetection(event.currentTarget.checked)}
							type="checkbox"
						/>
						<span className={styles.switchTrack} aria-hidden="true">
							<span className={styles.switchThumb} />
						</span>
					</label>
				</section>

				<div className={styles.statusLine} data-enabled={detectionPreferences.enabled}>
					<span className={styles.statusDot} aria-hidden="true" />
					<strong>
						{detectionPreferences.enabled ? (
							<Trans>Automatic detection is on</Trans>
						) : (
							<Trans>Automatic detection is off</Trans>
						)}
					</strong>
					<span className={styles.muted}>
						{nativeApi?.getRunningGameProcessNames ? (
							<Trans>Steam games and supported game processes are checked on this device.</Trans>
						) : (
							<Trans>
								Automatic detection runs in the NEXUS desktop app; activity from your computer can still appear here.
							</Trans>
						)}
					</span>
				</div>

				<section className={styles.settingRow} aria-labelledby="activity-sharing-title">
					<div className={styles.settingIcon} aria-hidden="true">
						<span className={styles.visibilityGlyph}>◎</span>
					</div>
					<div className={styles.settingCopy}>
						<h3 id="activity-sharing-title">
							<Trans>Share activity with server members</Trans>
						</h3>
						<p className={styles.muted}>
							<Trans>
								When off, your detected game is not shared with other members. You can still see it on your own profile.
							</Trans>
						</p>
					</div>
					<label className={styles.switch} aria-label={i18n._('Share activity with server members')}>
						<input
							checked={Boolean(profile?.share_with_guilds)}
							disabled={!profile || savingShare}
							onChange={(event) => void setActivitySharing(event.currentTarget.checked)}
							type="checkbox"
						/>
						<span className={styles.switchTrack} aria-hidden="true">
							<span className={styles.switchThumb} />
						</span>
					</label>
				</section>

				<aside className={styles.privacyNote}>
					<strong>
						<Trans>Privacy</Trans>
					</strong>
					<p className={styles.muted}>
						<Trans>
							Game detection happens on this device. NEXUS does not upload process names, file paths, or your Steam
							library; only the detected game title and activity status are used for your profile.
						</Trans>
					</p>
				</aside>
			</main>

			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

export default GamingTab;
