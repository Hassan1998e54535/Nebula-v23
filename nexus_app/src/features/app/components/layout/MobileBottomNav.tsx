// SPDX-License-Identifier: Nebula

import {Routes} from '@app/app/Routes';
import {UserAreaPopout} from '@app/features/app/components/floating/UserAreaPopout';
import styles from '@app/features/app/components/layout/MobileBottomNav.module.css';
import {CustomStatusDisplay} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import {useGamingPresenceHeartbeat} from '@app/features/gaming/GamingPresenceHeartbeat';
import {reportSkeletonVoiceConnected} from '@app/features/app/components/skeleton/SkeletonLayoutMemory';
import {useSkeletonLayoutReport} from '@app/features/app/hooks/useSkeletonLayoutMemoryCapture';
import {PRIMARY_NAVIGATION_LANDMARK_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import * as RouterUtils from '@app/features/navigation/utils/RouterUtils';
import {createNamedLoadableComponent} from '@app/features/platform/components/loadable/LoadableComponent';
import {useLocation} from '@app/features/platform/components/router/RouterReact';
import Presence from '@app/features/presence/state/Presence';
import * as PopoutCommands from '@app/features/ui/commands/PopoutCommands';
import {StatusAwareAvatar} from '@app/features/ui/components/StatusAwareAvatar';
import {usePopout} from '@app/features/ui/hooks/usePopout';
import {openPopout} from '@app/features/ui/popover/PopoverPopout';
import {NameplateMedia, ProfileEffectMedia} from '@app/features/user/components/profile/media/ProfileMedia';
import {ProfileDisplayName} from '@app/features/user/components/profile/media/ProfileDisplayName';
import * as UserProfileCommands from '@app/features/user/commands/UserProfileCommands';
import type {User} from '@app/features/user/models/User';
import UserProfileMobile from '@app/features/user/state/UserProfileMobile';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import {USER_PROFILE_DESCRIPTOR} from '@app/features/user/utils/UserMessageDescriptors';
import {useConnectedVoiceSession} from '@app/features/voice/hooks/useConnectedVoiceSession';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {ChannelTypes} from '@nexus/constants/src/ChannelConstants';
import {BellIcon, SpeakerHighIcon} from '@phosphor-icons/react';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import {useCallback, useRef, useState} from 'react';

const NOTIFICATIONS_NAV_DESCRIPTOR = msg({
	message: 'Notifications',
	comment: 'Accessible label for the notifications icon in the mobile bottom navigation.',
});

const VoiceLobbyBottomSheet = createNamedLoadableComponent<Record<string, unknown>>({
	displayName: 'VoiceLobbyBottomSheet',
	load: async () =>
		(await import('@app/features/voice/components/bottomsheets/VoiceLobbyBottomSheet')).VoiceLobbyBottomSheet,
});
const DirectCallLobbyBottomSheet = createNamedLoadableComponent<Record<string, unknown>>({
	displayName: 'DirectCallLobbyBottomSheet',
	load: async () =>
		(await import('@app/features/voice/components/bottomsheets/DirectCallLobbyBottomSheet')).DirectCallLobbyBottomSheet,
});

interface MobileBottomNavProps {
	currentUser: User;
}

export const MobileBottomNav = observer(({currentUser}: MobileBottomNavProps) => {
	const {i18n} = useLingui();
	useGamingPresenceHeartbeat(currentUser.id);
	const location = useLocation();
	const {isOpen: isAccountMenuOpen} = usePopout('user-area');
	const accountActionsOpenedAtRef = useRef(0);
	const [voiceLobbyOpen, setVoiceLobbyOpen] = useState(false);
	const [voiceLobbyLoaded, setVoiceLobbyLoaded] = useState(false);
	const isNotificationsActive = location.pathname === Routes.NOTIFICATIONS;
	const isYouActive = location.pathname === Routes.YOU;
	const displayName = NicknameUtils.getNickname(currentUser, null);
	const customStatus = Presence.getCustomStatus(currentUser.id);
	const {channel: voiceChannel, guild: voiceGuild, isConnected: isConnectedToVoice} = useConnectedVoiceSession();
	const isDirectCallChannel = Boolean(
		voiceChannel && (voiceChannel.type === ChannelTypes.DM || voiceChannel.type === ChannelTypes.GROUP_DM),
	);
const profileCustomization = currentUser.profileAppearance;
const profileAppearance = profileCustomization?.appearance;
const nameplateSettings = profileCustomization?.nameplateSettings;
const hasNameplate = Boolean(
nameplateSettings?.nameplate &&
nameplateSettings.nameplate !== 'none' &&
(nameplateSettings.nameplate !== 'custom' || nameplateSettings.nameplateImage),
);
	useSkeletonLayoutReport(() => {
		reportSkeletonVoiceConnected(isConnectedToVoice);
	}, `${isConnectedToVoice}`);
	const handleNavigation = useCallback(
		(path: string) => {
			if (location.pathname === path) return;
			RouterUtils.transitionTo(path);
		},
		[location.pathname],
	);
	const handleOpenOwnProfile = useCallback(() => {
		if (Date.now() - accountActionsOpenedAtRef.current < 500) return;
		PopoutCommands.close('user-area');
		UserProfileCommands.openUserProfile(currentUser.id);
	}, [currentUser.id]);
	const handleOpenAccountActions = useCallback((target: HTMLButtonElement) => {
		accountActionsOpenedAtRef.current = Date.now();
		openPopout(
			target,
			{
				render: () => <UserAreaPopout />,
				position: 'top',
				offsetMainAxis: 12,
				containerClass: styles.accountPopout,
			},
			'user-area',
		);
	}, []);
	const handleVoiceIndicatorPress = useCallback(() => {
		setVoiceLobbyLoaded(true);
		setVoiceLobbyOpen(true);
	}, []);
	const handleCloseVoiceLobby = useCallback(() => {
		setVoiceLobbyOpen(false);
	}, []);
	return (
		<>
			<nav
				className={styles.container}
				aria-label={i18n._(PRIMARY_NAVIGATION_LANDMARK_DESCRIPTOR)}
				data-feature-discovery-target="navigation"
				data-flx="app.mobile-bottom-nav.container"
			>
				<div className={styles.card} data-flx="app.mobile-bottom-nav.profile-card">
{(hasNameplate || profileCustomization?.profileEffectId) && (
<div className={styles.profileAppearanceLayer} aria-hidden="true" data-flx="app.mobile-bottom-nav.profile-appearance">
{hasNameplate && nameplateSettings && <NameplateMedia settings={nameplateSettings} />}
<ProfileEffectMedia effectId={profileCustomization?.profileEffectId} />
</div>
)}
				<div className={styles.accountGroup}>
					<button
						type="button"
						onClick={handleOpenOwnProfile}
						onContextMenu={(event) => {
							event.preventDefault();
							event.stopPropagation();
							handleOpenAccountActions(event.currentTarget);
						}}
						onKeyDown={(event) => {
							if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
								event.preventDefault();
								handleOpenAccountActions(event.currentTarget);
							}
						}}
						className={clsx(
							styles.accountButton,
							(isYouActive || UserProfileMobile.userId === currentUser.id) && styles.accountButtonActive,
						)}
						aria-label={i18n._(USER_PROFILE_DESCRIPTOR)}
						aria-haspopup="dialog"
						aria-expanded={isAccountMenuOpen || UserProfileMobile.userId === currentUser.id}
						aria-current={isYouActive ? 'page' : undefined}
						data-flx="app.mobile-bottom-nav.account-profile"
					>
<span className={styles.avatarWrap}>
						<StatusAwareAvatar
							user={currentUser}
							size={56}
							showOffline={true}
							data-flx="app.mobile-bottom-nav.account-avatar"
						/>
</span>
						<span className={styles.accountText}>
<span className={styles.accountName}>
<ProfileDisplayName name={displayName} appearance={profileAppearance} />
</span>
							{customStatus && (
								<span className={styles.accountTag}>
									<CustomStatusDisplay customStatus={customStatus} constrained />
								</span>
							)}
						</span>
					</button>
				</div>
				{isConnectedToVoice && (
					<button
						type="button"
						onClick={handleVoiceIndicatorPress}
						className={clsx(styles.navButton, styles.voiceButton)}
						aria-pressed={voiceLobbyOpen}
						data-flx="app.mobile-bottom-nav.nav-button.voice-indicator-press"
					>
						<SpeakerHighIcon weight="fill" className={styles.icon} data-flx="app.mobile-bottom-nav.icon--2" />
						<span className={styles.label} data-flx="app.mobile-bottom-nav.label--2">
							<Trans>Voice</Trans>
						</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => handleNavigation(Routes.NOTIFICATIONS)}
					className={clsx(
						styles.navButton,
						styles.notificationButton,
						isNotificationsActive ? styles.navButtonActive : styles.navButtonInactive,
					)}
					aria-label={i18n._(NOTIFICATIONS_NAV_DESCRIPTOR)}
					aria-current={isNotificationsActive ? 'page' : undefined}
					data-flx="app.mobile-bottom-nav.nav-button.navigation"
				>
					<BellIcon weight="fill" className={styles.icon} data-flx="app.mobile-bottom-nav.icon--3" />
				</button>
				</div>
			</nav>
			{isConnectedToVoice && voiceChannel && voiceGuild && !isDirectCallChannel && voiceLobbyLoaded && (
				<VoiceLobbyBottomSheet
					isOpen={voiceLobbyOpen}
					onClose={handleCloseVoiceLobby}
					channel={voiceChannel}
					guild={voiceGuild}
					data-flx="app.mobile-bottom-nav.voice-lobby-bottom-sheet"
				/>
			)}
			{isConnectedToVoice && voiceChannel && isDirectCallChannel && voiceLobbyLoaded && (
				<DirectCallLobbyBottomSheet
					isOpen={voiceLobbyOpen}
					onClose={handleCloseVoiceLobby}
					channel={voiceChannel}
					data-flx="app.mobile-bottom-nav.direct-call-lobby-bottom-sheet"
				/>
			)}
		</>
	);
});
