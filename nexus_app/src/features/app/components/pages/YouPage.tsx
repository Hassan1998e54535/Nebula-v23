// SPDX-License-Identifier: Nebula

import {Routes} from '@app/app/Routes';
import {UserSettingsModal} from '@app/features/app/components/dialogs/LoadableSettingsModals';
import styles from '@app/features/app/components/pages/YouPage.module.css';
import {CustomStatusDisplay} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import {useAnimatedImageUrl} from '@app/features/app/hooks/useAnimatedImageUrl';
import {getStatusTypeLabel} from '@app/features/app/constants/AppConstants';
import {openAccountSwitcherModal} from '@app/features/auth/commands/AccountSwitcherModalCommands';
import {createNamedLoadableComponent} from '@app/features/platform/components/loadable/LoadableComponent';
import {OPEN_SETTINGS_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import Presence from '@app/features/presence/state/Presence';
import {getUserAccentColor} from '@app/features/theme/utils/AccentColorUtils';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import {NotificationDot} from '@app/features/ui/components/NotificationDot';
import {Scroller} from '@app/features/ui/components/Scroller';
import {StatusIndicator} from '@app/features/ui/components/StatusIndicator';
import {MenuBottomSheet, type MenuGroupType} from '@app/features/ui/menu_bottom_sheet/MenuBottomSheet';
import {StatusAwareAvatar} from '@app/features/ui/components/StatusAwareAvatar';
import {openUserSettingsModal} from '@app/features/user/commands/UserSettingsModalCommands';
import {NoteEditSheet} from '@app/features/user/components/modals/NoteEditSheet';
import {UserProfileBadges} from '@app/features/user/components/popouts/UserProfileBadges';
import {UserProfileBio, UserProfileMembershipInfo} from '@app/features/user/components/popouts/UserProfileShared';
import {USER_SETTINGS_PRIVACY_REVIEW_NEEDED_DESCRIPTOR} from '@app/features/user/components/settings_utils/SettingsConstants';
import {normalizeCustomStatus} from '@app/features/user/state/CustomStatus';
import UserNote from '@app/features/user/state/UserNote';
import UserSettings from '@app/features/user/state/UserSettings';
import Users from '@app/features/user/state/Users';
import * as AvatarUtils from '@app/features/user/utils/AvatarUtils';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import {createMockProfile} from '@app/features/user/utils/ProfileUtils';
import {StatusTypes} from '@nexus/constants/src/StatusConstants';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {CaretDownIcon, GearIcon, NotePencilIcon, PencilIcon, PlusIcon, UsersThreeIcon} from '@phosphor-icons/react';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import {useId, useMemo, useState} from 'react';

const OPEN_AVATAR_DESCRIPTOR = msg({
	message: 'Open avatar',
	comment: 'Short label in the you page.',
});
const SET_STATUS_DESCRIPTOR = msg({
	message: 'Set status',
	comment: 'Accessible label for the status control on the You page.',
});
const OPEN_ACCOUNT_ACTIONS_DESCRIPTOR = msg({
	message: 'Open account actions',
	comment: 'Accessible label for the account actions button on the You page.',
});
const SWITCH_ACCOUNTS_DESCRIPTOR = msg({
	message: 'Switch accounts',
	comment: 'Action that opens the account switcher.',
});
const StatusChangeBottomSheet = createNamedLoadableComponent<{
	isOpen: boolean;
	onClose: () => void;
}>({
	displayName: 'StatusChangeBottomSheet',
	load: async () =>
		(await import('@app/features/user/components/modals/StatusChangeBottomSheet')).StatusChangeBottomSheet,
});

interface YouPageProps {
	onAvatarClick: () => void;
}

export const YouPage = observer(({onAvatarClick}: YouPageProps) => {
	const {i18n} = useLingui();
	const bannerClipId = `you-banner-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
	const user = Users.currentUser;
	const userNote = user ? UserNote.getUserNote(user.id) : '';
	const [noteSheetOpen, setNoteSheetOpen] = useState(false);
	const [statusSheetOpen, setStatusSheetOpen] = useState(false);
	const [accountActionsOpen, setAccountActionsOpen] = useState(false);
	const privacySetupPending = UserSettings.isPrivacySetupPending();
	const status = user ? (Presence.getStatus(user.id) ?? StatusTypes.ONLINE) : StatusTypes.ONLINE;
	const openAccountSwitcher = () => {
		openAccountSwitcherModal(
			{
				closeCurrentAccountOnSelect: true,
				initialReloginAccount: null,
				redirectAfterLogin: null,
				redirectAfterSwitch: Routes.ME,
				switchAccount: null,
				'data-flx': 'app.you-page.account-switcher-modal',
			},
			null,
		);
	};
	const openStatusPickerFromActions = () => {
		ModalCommands.runAfterBottomSheetClose(() => setAccountActionsOpen(false), () => setStatusSheetOpen(true));
	};
	const openAccountSwitcherFromActions = () => {
		ModalCommands.runAfterBottomSheetClose(() => setAccountActionsOpen(false), openAccountSwitcher);
	};
	const accountActionGroups: Array<MenuGroupType> = [
		{
			items: [
				{
					icon: <StatusIndicator status={status} size={14} />,
					label: getStatusTypeLabel(i18n, status),
					onClick: openStatusPickerFromActions,
				},
				{
					icon: <UsersThreeIcon size={16} weight="bold" />,
					label: i18n._(SWITCH_ACCOUNTS_DESCRIPTOR),
					onClick: openAccountSwitcherFromActions,
				},
			],
		},
	];
	const handleEditProfile = () => {
		ModalCommands.push(
			modal(
				() => (
					<UserSettingsModal initialTab="my_profile" data-flx="app.you-page.handle-edit-profile.user-settings-modal" />
				),
				'user-settings',
			),
		);
	};
	const profile = useMemo(() => (user ? createMockProfile(user) : null), [user]);
	const bannerColor =
		user && profile ? getUserAccentColor(user, profile.getEffectiveProfile().accent_color) : 'var(--brand-primary)';
	const normalizedCustomStatus = useMemo(() => {
		if (!user) return null;
		return normalizeCustomStatus(Presence.getCustomStatus(user.id));
	}, [user]);
	const hasCustomStatus = Boolean(normalizedCustomStatus);
	const userId = user?.id;
	const userBanner = user?.banner;
	const staticBannerUrl = useMemo(
		() => (userId && userBanner ? AvatarUtils.getUserBannerURL({id: userId, banner: userBanner}, false) : null),
		[userId, userBanner],
	);
	const animatedBannerUrl = useMemo(
		() => (userId && userBanner ? AvatarUtils.getUserBannerURL({id: userId, banner: userBanner}, true) : null),
		[userId, userBanner],
	);
	const {hoverRef: bannerHoverRef, imageUrl: bannerUrl} = useAnimatedImageUrl({
		staticUrl: staticBannerUrl,
		animatedUrl: animatedBannerUrl,
		kind: 'gif',
	});
	if (!user || !profile) return null;
	return (
		<>
			<div className={styles.container} data-flx="app.you-page.container">
				<Scroller key="you-page-scroller" data-flx="app.you-page.scroller">
					<div
						style={{paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 1rem)'}}
						data-flx="app.you-page.div"
					>
						<div ref={bannerHoverRef} className={styles.banner} data-flx="app.you-page.banner">
							<svg
								className={styles.bannerMask}
								viewBox="0 0 100 100"
								preserveAspectRatio="none"
								aria-hidden="true"
								data-flx="app.you-page.banner-mask"
							>
								<defs>
									<clipPath id={bannerClipId} clipPathUnits="objectBoundingBox">
										<path d="M 0 0 L 1 0 L 1 0.7636 C 0.61 0.935, 0.19 0.8085, 0 1 Z" />
									</clipPath>
								</defs>
								<foreignObject
									x="0"
									y="0"
									width="100"
									height="100"
									clipPath={`url(#${bannerClipId})`}
									data-flx="app.you-page.banner-foreign-object"
								>
									<div
										className={clsx(styles.bannerImage, !bannerUrl && styles.bannerDefault)}
										style={{
											backgroundColor: bannerColor,
											...(bannerUrl ? {backgroundImage: `url(${bannerUrl})`} : {}),
										}}
										data-flx="app.you-page.banner-image"
									/>
								</foreignObject>
								<path
									d="M 0 100 C 19 80.85, 61 93.5, 100 76.36"
									fill="none"
									stroke={bannerColor}
									strokeWidth="1.25"
									vectorEffect="non-scaling-stroke"
									pointerEvents="none"
									data-flx="app.you-page.banner-curve"
								/>
							</svg>
						</div>
						<div className={styles.profile} data-flx="app.you-page.profile">
							<button
								type="button"
								onClick={onAvatarClick}
								className={styles.avatarButton}
								aria-label={i18n._(OPEN_AVATAR_DESCRIPTOR)}
								data-flx="app.you-page.avatar-button.avatar-click"
							>
								<StatusAwareAvatar size={80} user={user} data-flx="app.you-page.status-aware-avatar" />
							</button>
							{status === StatusTypes.ONLINE && Presence.isMobile(user.id) && (
								<button
									type="button"
									onClick={() => setAccountActionsOpen(true)}
									className={styles.avatarStatusButton}
									aria-label={i18n._(OPEN_ACCOUNT_ACTIONS_DESCRIPTOR)}
									data-flx="app.you-page.avatar-status-button"
								/>
							)}
							<div className={styles.content} data-flx="app.you-page.content">
								<div className={styles.actions} data-flx="app.you-page.actions">
									<button
										type="button"
										onClick={openUserSettingsModal}
										className={styles.settingsButton}
										aria-label={
											privacySetupPending
												? i18n._(USER_SETTINGS_PRIVACY_REVIEW_NEEDED_DESCRIPTOR)
												: i18n._(OPEN_SETTINGS_DESCRIPTOR)
										}
										data-flx="app.you-page.settings-button"
									>
										<GearIcon
											className={clsx(styles.settingsIcon, privacySetupPending && styles.settingsIconWithDot)}
											weight="fill"
											data-flx="app.you-page.settings-icon"
										/>
										{privacySetupPending && (
											<NotificationDot className={styles.settingsDot} data-flx="app.you-page.privacy-review-dot" />
										)}
									</button>
								</div>
								<div className={styles.userInfo} data-flx="app.you-page.user-info">
									<div className={styles.usernameRow} data-flx="app.you-page.username-row">
										<span className={styles.username} data-flx="app.you-page.username">
											{NicknameUtils.getDisplayName(user)}
										</span>
										<button
											type="button"
											className={styles.accountSwitcherButton}
											onClick={() => setAccountActionsOpen(true)}
											aria-label={i18n._(OPEN_ACCOUNT_ACTIONS_DESCRIPTOR)}
											data-flx="app.you-page.account-switcher-button"
										>
											<CaretDownIcon weight="bold" />
										</button>
									</div>
									<div className={styles.tagBadgeRow} data-flx="app.you-page.tag-badge-row">
										<span className={styles.fullTag} data-flx="app.you-page.full-tag">
											{NicknameUtils.formatTagForStreamerMode(user.tag)}
										</span>
										<div className={styles.badgesWrapper} data-flx="app.you-page.badges-wrapper">
											<UserProfileBadges
												user={user}
												profile={profile}
												isModal={true}
												isMobile={true}
												data-flx="app.you-page.user-profile-badges"
											/>
										</div>
									</div>
									{hasCustomStatus && (
										<div className={styles.customStatusRow} data-flx="app.you-page.custom-status-row">
											<CustomStatusDisplay
												userId={user.id}
												className={styles.customStatusText}
												showTooltip
												allowJumboEmoji
												animateOnParentHover
												data-flx="app.you-page.custom-status-text"
											/>
										</div>
									)}
								</div>
								{user.isClaimed() && (
									<button
										type="button"
										onClick={handleEditProfile}
										className={styles.editButton}
										data-flx="app.you-page.edit-button.edit-profile"
									>
										<PencilIcon className={styles.editIcon} data-flx="app.you-page.edit-icon" />
										<span className={styles.editLabel} data-flx="app.you-page.edit-label">
											<Trans>Edit profile</Trans>
										</span>
									</button>
								)}
								<div className={styles.accountActions} data-flx="app.you-page.account-actions">
									<button
										type="button"
										className={styles.accountActionButton}
										onClick={() => setStatusSheetOpen(true)}
										aria-label={i18n._(SET_STATUS_DESCRIPTOR)}
										data-flx="app.you-page.status-action"
									>
										<span className={styles.accountActionTitle}>
											<StatusIndicator status={status} size={14} />
											<Trans>Set status</Trans>
										</span>
										<span className={styles.accountActionValue}>
											<span>{getStatusTypeLabel(i18n, status)}</span>
											<CaretDownIcon className={styles.accountActionIcon} weight="bold" />
										</span>
									</button>
									<div className={styles.accountActionDivider} />
									<button
										type="button"
										className={styles.accountActionButton}
										onClick={openAccountSwitcher}
										data-flx="app.you-page.add-account"
									>
										<span>
											<Trans>Add account</Trans>
										</span>
										<PlusIcon className={styles.accountActionIcon} />
									</button>
								</div>
								{(profile?.userProfile.bio || profile) && (
									<div className={styles.section} data-flx="app.you-page.section">
										{profile?.userProfile.bio && (
											<div className={styles.sectionHeader} data-flx="app.you-page.section-header">
												<h3 className={styles.sectionTitle} data-flx="app.you-page.section-title">
													<Trans>About me</Trans>
												</h3>
												<UserProfileBio profile={profile} data-flx="app.you-page.user-profile-bio" />
											</div>
										)}
										<UserProfileMembershipInfo
											profile={profile}
											user={user}
											data-flx="app.you-page.user-profile-membership-info"
										/>
									</div>
								)}
								<button
									type="button"
									onClick={() => setNoteSheetOpen(true)}
									className={styles.noteButton}
									data-flx="app.you-page.note-button.set-note-sheet-open"
								>
									<div data-flx="app.you-page.div--2">
										<h3 className={styles.noteLabel} data-flx="app.you-page.note-label">
											<Trans>Note</Trans>
										</h3>
										<p className={styles.noteSubtext} data-flx="app.you-page.note-subtext">
											<Trans>(only visible to you)</Trans>
										</p>
										{userNote && (
											<p className={styles.noteText} data-flx="app.you-page.note-text">
												{userNote}
											</p>
										)}
									</div>
									<div className={styles.noteIconWrapper} data-flx="app.you-page.note-icon-wrapper">
										<NotePencilIcon className={styles.noteIcon} data-flx="app.you-page.note-icon" />
									</div>
								</button>
							</div>
						</div>
					</div>
				</Scroller>
			</div>
			<NoteEditSheet
				isOpen={noteSheetOpen}
				onClose={() => setNoteSheetOpen(false)}
				userId={user.id}
				initialNote={userNote}
				data-flx="app.you-page.note-edit-sheet"
			/>
			<StatusChangeBottomSheet isOpen={statusSheetOpen} onClose={() => setStatusSheetOpen(false)} />
			<MenuBottomSheet
				isOpen={accountActionsOpen}
				onClose={() => setAccountActionsOpen(false)}
				groups={accountActionGroups}
				data-flx="app.you-page.account-actions-sheet"
			/>
		</>
	);
});
