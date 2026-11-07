// SPDX-License-Identifier: Nebula

import {CustomStatusDisplay} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import Guilds from '@app/features/guild/state/Guilds';
import type {GuildMember} from '@app/features/member/models/GuildMember';
import {Button} from '@app/features/ui/button/Button';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import FocusRing from '@app/features/ui/focus_ring/FocusRing';
import {Tooltip} from '@app/features/ui/tooltip/Tooltip';
import {UserProfileModal} from '@app/features/user/components/modals/UserProfileModal';
import {UserProfileBadges} from '@app/features/user/components/popouts/UserProfileBadges';
import popoutStyles from '@app/features/user/components/popouts/UserProfilePopout.module.css';
import {
	UserProfileMembershipInfo,
	UserProfilePreviewBio,
	UserProfileTimezoneInfo,
} from '@app/features/user/components/popouts/UserProfileShared';
import styles from '@app/features/user/components/profile/ProfilePreview.module.css';
import {ProfileCardBanner} from '@app/features/user/components/profile/profile_card/ProfileCardBanner';
import {ProfileCardContent} from '@app/features/user/components/profile/profile_card/ProfileCardContent';
import {ProfileCardFooter} from '@app/features/user/components/profile/profile_card/ProfileCardFooter';
import profileHeroStyles from '@app/features/user/components/profile/profile_card/ProfileCardHero.module.css';
import {ProfileCardLayout} from '@app/features/user/components/profile/profile_card/ProfileCardLayout';
import {ProfileCardUserInfo} from '@app/features/user/components/profile/profile_card/ProfileCardUserInfo';
import {useProfileCardDisplayState} from '@app/features/user/components/profile/useProfileCardDisplayState';
import {PROFILE_POPOUT_GEOMETRY_STYLE} from '@app/features/user/constants/UserProfileSurfaceGeometry';
import {useAutoplayExpandedProfileAnimations} from '@app/features/user/hooks/useAutoplayExpandedProfileAnimations';
import type {Profile} from '@app/features/user/models/Profile';
import type {CustomStatus} from '@app/features/user/state/CustomStatus';
import type {User} from '@app/features/user/models/User';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import * as ProfileDisplayUtils from '@app/features/user/utils/ProfileDisplayUtils';
import {type BadgeSettings, createMockProfile} from '@app/features/user/utils/ProfileUtils';
import {YOU_CAN_T_MESSAGE_YOURSELF_DESCRIPTOR} from '@app/features/user/utils/UserMessageDescriptors';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import type {ProfileCustomization} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import type {UserProfile} from '@nexus/schema/src/domains/user/UserResponseSchemas';
import {ChatTeardropIcon, IdentificationBadgeIcon, PencilIcon} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useCallback, useMemo} from 'react';

const PROFILE_PREVIEW_PRESS_ENTER_TO_OPEN_FULL_PREVIEW_DESCRIPTOR = msg({
	message: 'Profile preview (press Enter to open full preview)',
	comment: 'Label in the user settings profile preview.',
});
const EDIT_PROFILE_DETAILS_DESCRIPTOR = msg({
	message: 'Edit profile details',
	comment: 'Accessible label for the profile preview edit button.',
});
const EDIT_PROFILE_DISPLAY_NAME_DESCRIPTOR = msg({
	message: 'Edit display name',
	comment: 'Accessible label for the inline display-name editor in the mobile profile card.',
});
const EDIT_PROFILE_BIO_DESCRIPTOR = msg({
	message: 'Edit profile bio',
	comment: 'Accessible label for the inline bio editor in the mobile profile card.',
});
const ADD_PROFILE_BIO_DESCRIPTOR = msg({
	message: 'Tap to add a bio',
	comment: 'Hint shown in the mobile profile card when the bio is empty.',
});
const DONE_EDITING_PROFILE_BIO_DESCRIPTOR = msg({
	message: 'Done',
	comment: 'Closes the inline profile bio editor.',
});

interface ProfilePreviewProps {
	user: User;
	previewAvatarUrl?: string | null;
	previewBannerUrl?: string | null;
	hasClearedAvatar?: boolean;
	hasClearedBanner?: boolean;
	previewBio?: string | null;
	previewPronouns?: string | null;
	previewAccentColor?: number | null;
	previewTimezoneOffset?: number | null;
	previewGlobalName?: string | null;
	previewNick?: string | null;
	guildId?: string | null;
	guildMember?: GuildMember | null;
	guildMemberProfile?: UserProfile | null;
	previewBadgeSettings?: BadgeSettings;
	ignoreGuildAvatarInPreview?: boolean;
	ignoreGuildBannerInPreview?: boolean;
	showMembershipInfo?: boolean;
	showMessageButton?: boolean;
	showPreviewLabel?: boolean;
	previewCustomStatus?: CustomStatus | null;
	previewCustomization?: ProfileCustomization | null;
	compact?: boolean;
	expandedCard?: boolean;
	mobileCompactCard?: boolean;
	mobileEditorSurface?: boolean;
	mobileInlineEditTarget?: 'displayName' | 'bio' | null;
	onMobileInlineEditTargetChange?: (target: 'displayName' | 'bio' | null) => void;
	onMobileDisplayNameChange?: (name: string) => void;
	canMobileEditDisplayName?: boolean;
	canMobileEditBio?: boolean;
	mobileInlineBioEditor?: React.ReactNode;
	editorControls?: React.ReactNode;
	onEditAvatar?: () => void;
	onEditCover?: () => void;
	onEditIdentity?: () => void;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = observer(
	({
		user,
		previewAvatarUrl,
		previewBannerUrl,
		hasClearedAvatar,
		hasClearedBanner,
		previewBio,
		previewPronouns,
		previewAccentColor,
		previewTimezoneOffset,
		previewGlobalName,
		previewNick,
		guildId,
		guildMember,
		guildMemberProfile,
		previewBadgeSettings,
		ignoreGuildAvatarInPreview,
		ignoreGuildBannerInPreview,
		showMembershipInfo = true,
		showMessageButton = true,
		showPreviewLabel = true,
		previewCustomStatus,
		previewCustomization,
		compact = false,
		expandedCard = false,
		mobileCompactCard = false,
		mobileEditorSurface = false,
		mobileInlineEditTarget = null,
		onMobileInlineEditTargetChange,
		onMobileDisplayNameChange,
		canMobileEditDisplayName = false,
		canMobileEditBio = false,
		mobileInlineBioEditor,
		editorControls,
		onEditAvatar,
		onEditCover,
		onEditIdentity,
	}) => {
		const {i18n} = useLingui();
const previewOverrides = useMemo<ProfileDisplayUtils.ProfilePreviewOverrides>(
			() => ({
				previewAvatarUrl,
				previewBannerUrl,
				hasClearedAvatar,
				hasClearedBanner,
				ignoreGuildAvatar: ignoreGuildAvatarInPreview,
				ignoreGuildBanner: ignoreGuildBannerInPreview,
			}),
			[
				previewAvatarUrl,
				previewBannerUrl,
				hasClearedAvatar,
				hasClearedBanner,
				ignoreGuildAvatarInPreview,
				ignoreGuildBannerInPreview,
			],
		);
		const isCommunityProfile = Boolean(guildId && guildMemberProfile);
		const previewUser = useMemo(() => {
			const globalName = previewGlobalName !== undefined ? previewGlobalName : user.globalName;
			if (isCommunityProfile) {
				return user.withUpdates({global_name: globalName});
			}
			const bio = previewBio !== undefined ? previewBio : user.bio;
			const pronouns = previewPronouns !== undefined ? previewPronouns : user.pronouns;
			return user.withUpdates({bio, pronouns, global_name: globalName});
		}, [user, previewBio, previewPronouns, previewGlobalName, isCommunityProfile]);
		const mockProfile = useMemo(() => {
			if (isCommunityProfile && guildId && guildMemberProfile) {
				const globalProfile = createMockProfile(previewUser, {
					previewTimezoneOffset,
					previewBadgeSettings,
				});
				return globalProfile.withGuildId(guildId).withUpdates({
					guild_member: guildMember?.toJSON(),
					guild_member_profile: {
						bio: previewBio !== undefined ? previewBio : guildMemberProfile.bio,
						banner: previewBannerUrl || guildMemberProfile.banner,
						pronouns: previewPronouns !== undefined ? previewPronouns : guildMemberProfile.pronouns,
						accent_color: previewAccentColor !== undefined ? previewAccentColor : guildMemberProfile.accent_color,
profile_appearance:
previewCustomization !== undefined ? previewCustomization : guildMemberProfile.profile_appearance,
					},
				});
			}
			return createMockProfile(previewUser, {
				previewBannerUrl,
				hasClearedBanner,
				previewBio,
				previewPronouns,
				previewAccentColor,
				previewTimezoneOffset,
				previewBadgeSettings,
			});
		}, [
			previewUser,
			previewBannerUrl,
			hasClearedBanner,
			previewBio,
			previewPronouns,
			previewAccentColor,
			previewTimezoneOffset,
			previewBadgeSettings,
			guildId,
			guildMember,
			guildMemberProfile,
			isCommunityProfile,
	previewCustomization,
		]);
		const shouldAutoplayProfileAnimations = useAutoplayExpandedProfileAnimations();
		const {
			avatarUrl: finalAvatarUrl,
			hoverAvatarUrl: finalHoverAvatarUrl,
			bannerUrl: finalBannerUrl,
			hoverBannerUrl: finalHoverBannerUrl,
			accentColor,
		} = useProfileCardDisplayState({
			user,
			profile: mockProfile,
			guildId,
			guildMember,
			guildMemberProfile: mockProfile.getGuildMemberProfile() ?? guildMemberProfile,
			previewOverrides,
			accentUser: previewUser,
		});
		const openMockProfile = useCallback(() => {
			ModalCommands.push(
				modal(() => (
					<UserProfileModal
						userId={user.id}
						guildId={guildId || undefined}
						disableEditProfile={true}
						previewOverrides={{
							previewAvatarUrl,
							previewBannerUrl,
							previewAccentColor,
							hasClearedAvatar,
							hasClearedBanner,
							ignoreGuildAvatar: ignoreGuildAvatarInPreview,
							ignoreGuildBanner: ignoreGuildBannerInPreview,
						}}
						previewUser={previewUser}
						previewProfile={mockProfile}
						data-flx="user.profile.profile-preview.open-mock-profile.user-profile-modal"
					/>
				)),
			);
		}, [
			user.id,
			guildId,
			previewAvatarUrl,
			previewBannerUrl,
			previewAccentColor,
			hasClearedAvatar,
			hasClearedBanner,
			ignoreGuildAvatarInPreview,
			ignoreGuildBannerInPreview,
			previewUser,
			mockProfile,
		]);
		const pronouns = previewPronouns !== undefined ? previewPronouns : user.pronouns;
		const displayName =
			previewNick || (guildId ? NicknameUtils.getNickname(previewUser, guildId) : previewUser.displayName);
		const inlineDisplayNameEditor =
			mobileEditorSurface &&
			canMobileEditDisplayName &&
			mobileInlineEditTarget === 'displayName' &&
			onMobileDisplayNameChange != null ? (
				<input
					type="text"
					autoFocus
					className={styles.mobileInlineDisplayNameEditor}
					value={previewNick !== undefined ? (previewNick ?? '') : (previewGlobalName ?? '')}
					placeholder={displayName}
					maxLength={32}
					aria-label={i18n._(EDIT_PROFILE_DISPLAY_NAME_DESCRIPTOR)}
					onChange={(event) => onMobileDisplayNameChange(event.currentTarget.value)}
					onBlur={() => onMobileInlineEditTargetChange?.(null)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === 'Escape') {
							event.preventDefault();
							event.currentTarget.blur();
						}
					}}
					data-flx="user.profile.profile-preview.mobile-inline-display-name-editor"
				/>
			) : undefined;
		const editDisplayName =
			canMobileEditDisplayName && onMobileInlineEditTargetChange
				? () => onMobileInlineEditTargetChange('displayName')
				: (onEditIdentity ?? openMockProfile);
		const appearance = ProfileDisplayUtils.getProfileAppearance(
			previewCustomization ?? mockProfile.getEffectiveProfile().profile_appearance,
		);
const profileMediaLayers = ProfileDisplayUtils.getProfileMediaLayers(
!isCommunityProfile && previewCustomization
? previewCustomization
: mockProfile.userProfile.profile_appearance,
isCommunityProfile
? (previewCustomization ?? mockProfile.guildMemberProfile?.profile_appearance)
: null,
);
const profileEffectId = profileMediaLayers.profileEffectIds.at(-1) ?? null;
const {borderColor, coverColor: bannerColor} = ProfileDisplayUtils.getProfileSurfaceColors(
appearance,
accentColor ?? '#9c1111',
);
		const selectedGuild = guildId ? Guilds.getGuild(guildId) : null;
		const hasPreviewStatus = previewCustomStatus !== undefined;
		const handlePreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
			if (event.target !== event.currentTarget) return;
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				openMockProfile();
			}
		};
		return (
			<FocusRing offset={-2} data-flx="user.profile.profile-preview.focus-ring">
				<div
					className={[
						styles.previewInteractive,
						compact ? styles.compactPreview : '',
						expandedCard ? styles.expandedPreview : '',
					].filter(Boolean).join(' ')}
					role="group"
					aria-label={i18n._(PROFILE_PREVIEW_PRESS_ENTER_TO_OPEN_FULL_PREVIEW_DESCRIPTOR)}
					onKeyDown={handlePreviewKeyDown}
					data-flx="user.profile.profile-preview.preview-interactive.preview-key-down"
				>
					<ProfileCardLayout
						borderColor={borderColor}
						appearance={appearance}
profileEffectId={profileEffectId}
profileEffectLayers={profileMediaLayers.profileEffectIds}
profileFrameLayers={profileMediaLayers.cardFrameIds}
						showPreviewLabel={showPreviewLabel}
						className={
							expandedCard
								? [
										popoutStyles.profilePopoutCard,
										editorControls && !mobileEditorSurface ? '' : popoutStyles.profilePopoutCardSelf,
										styles.expandedPreviewCard,
										mobileEditorSurface ? styles.mobileExpandedPreviewCard : '',
										mobileCompactCard ? styles.mobileCompactPreviewCard : '',
									]
										.filter(Boolean)
										.join(' ')
								: undefined
						}
						style={
							expandedCard
								? ({
										...PROFILE_POPOUT_GEOMETRY_STYLE,
										'--profile-popout-content-width': '100%',
										'--profile-card-width': '100%',
										'--profile-sheet-accent': accentColor,
									} as React.CSSProperties)
								: compact
									? ({'--profile-card-width': '100%', '--profile-card-radius': '.85rem'} as React.CSSProperties)
									: undefined
						}
						data-flx="user.profile.profile-preview.profile-card-layout"
					>
						{expandedCard ? (
							<div className={profileHeroStyles.profileHero}>
								<ProfileCardBanner
									variant="expanded"
									bannerUrl={finalBannerUrl}
									hoverBannerUrl={finalHoverBannerUrl}
									bannerColor={bannerColor}
									user={user}
									avatarUrl={finalAvatarUrl}
									appearance={appearance}
									hoverAvatarUrl={finalHoverAvatarUrl}
									isClickable={true}
									showEditControls={
										mobileEditorSurface &&
										canMobileEditBio &&
										onEditAvatar != null &&
										onEditCover != null
									}
									onAvatarClick={onEditAvatar ?? openMockProfile}
									onBannerClick={onEditCover}
									data-flx="user.profile.profile-preview.profile-card-banner"
								/>
								<div className={profileHeroStyles.profileHeroIdentity}>
									<ProfileCardUserInfo
										displayName={displayName}
										appearance={appearance}
										inlineDisplayNameEditor={inlineDisplayNameEditor}
										displayNameClassName={popoutStyles.profileDisplayName}
										user={previewUser}
										pronouns={pronouns}
										showUsername={true}
										isClickable={true}
										onDisplayNameClick={editDisplayName}
										onUsernameClick={editDisplayName}
										data-flx="user.profile.profile-preview.profile-card-user-info"
									/>
									<div className={popoutStyles.profileCustomStatus} data-flx="user.profile.profile-preview.profile-custom-status">
										<CustomStatusDisplay
											userId={hasPreviewStatus ? undefined : user.id}
											customStatus={hasPreviewStatus ? previewCustomStatus : undefined}
											className={popoutStyles.profileCustomStatusText}
											allowJumboEmoji
											maxLines={0}
											alwaysAnimate={shouldAutoplayProfileAnimations}
											data-flx="user.profile.profile-preview.profile-custom-status-text"
										/>
									</div>
								</div>
								{onEditIdentity && !editorControls && (
									<div className={popoutStyles.profileHeroActions}>
										<button
											type="button"
											className={styles.expandedEditButton}
											aria-label={i18n._(EDIT_PROFILE_DETAILS_DESCRIPTOR)}
											onClick={onEditIdentity}
										>
											<span aria-hidden="true">⋯</span>
										</button>
									</div>
								)}
							</div>
						) : (
							<ProfileCardBanner
								bannerUrl={finalBannerUrl}
								hoverBannerUrl={finalHoverBannerUrl}
								bannerColor={bannerColor}
								user={user}
								avatarUrl={finalAvatarUrl}
								appearance={appearance}
								hoverAvatarUrl={finalHoverAvatarUrl}
								isClickable={true}
								onAvatarClick={onEditAvatar ?? openMockProfile}
								onBannerClick={onEditCover}
								data-flx="user.profile.profile-preview.profile-card-banner"
							/>
						)}
						<UserProfileBadges
							user={previewUser}
							profile={mockProfile}
							data-flx="user.profile.profile-preview.user-profile-badges"
						/>
						<ProfileCardContent data-flx="user.profile.profile-preview.profile-card-content">
							{!expandedCard && (
								<>
									<ProfileCardUserInfo
										displayName={displayName}
										appearance={appearance}
										inlineDisplayNameEditor={inlineDisplayNameEditor}
										user={previewUser}
										pronouns={pronouns}
										showUsername={true}
										isClickable={true}
										onDisplayNameClick={editDisplayName}
										onUsernameClick={editDisplayName}
										data-flx="user.profile.profile-preview.profile-card-user-info"
									/>
									<div className={styles.profileCustomStatus} data-flx="user.profile.profile-preview.profile-custom-status">
										<CustomStatusDisplay
											userId={hasPreviewStatus ? undefined : user.id}
											customStatus={hasPreviewStatus ? previewCustomStatus : undefined}
											className={styles.profileCustomStatusText}
											allowJumboEmoji
											maxLines={0}
											alwaysAnimate={shouldAutoplayProfileAnimations}
											data-flx="user.profile.profile-preview.profile-custom-status-text"
										/>
									</div>
								</>
							)}
							{!compact && (
								<>
									{mobileEditorSurface &&
									canMobileEditBio &&
									mobileInlineEditTarget === 'bio' &&
									mobileInlineBioEditor != null ? (
										<div
											className={styles.mobileInlineBioEditor}
											data-flx="user.profile.profile-preview.mobile-inline-bio-editor"
										>
											{mobileInlineBioEditor}
											<button
												type="button"
												onClick={() => onMobileInlineEditTargetChange?.(null)}
												data-flx="user.profile.profile-preview.mobile-inline-bio-done"
											>
												{i18n._(DONE_EDITING_PROFILE_BIO_DESCRIPTOR)}
											</button>
										</div>
									) : mobileEditorSurface &&
										canMobileEditBio &&
										onMobileInlineEditTargetChange ? (
										<div className={styles.mobileBioEditTarget}>
											<div className={styles.mobileBioPreviewContent} aria-hidden="true">
												<UserProfilePreviewBio
													profile={mockProfile}
													onShowMore={openMockProfile}
													data-flx="user.profile.profile-preview.user-profile-preview-bio"
												/>
											</div>
											{!previewBio?.trim() && (
												<span className={styles.mobileBioEditHint}>
													{i18n._(ADD_PROFILE_BIO_DESCRIPTOR)}
												</span>
											)}
											<button
												type="button"
												className={styles.mobileBioEditButton}
												aria-label={i18n._(EDIT_PROFILE_BIO_DESCRIPTOR)}
												onClick={() => onMobileInlineEditTargetChange('bio')}
												data-flx="user.profile.profile-preview.mobile-bio-edit-button"
											>
												<PencilIcon size={14} weight="bold" aria-hidden="true" />
											</button>
										</div>
									) : (
										<UserProfilePreviewBio
											profile={mockProfile}
											onShowMore={openMockProfile}
											data-flx="user.profile.profile-preview.user-profile-preview-bio"
										/>
									)}
									<UserProfileTimezoneInfo
										profile={mockProfile}
										data-flx="user.profile.profile-preview.user-profile-timezone-info"
									/>
								</>
							)}
							{!compact && (showMembershipInfo ?? expandedCard) && (
								<UserProfileMembershipInfo
									profile={{...mockProfile, guild: selectedGuild, guildMember} as Profile}
									user={previewUser}
									data-flx="user.profile.profile-preview.user-profile-membership-info"
								/>
							)}
									{expandedCard && editorControls}
						</ProfileCardContent>
						{!compact && showMessageButton && (
							<ProfileCardFooter data-flx="user.profile.profile-preview.profile-card-footer">
								<Tooltip
									text={i18n._(YOU_CAN_T_MESSAGE_YOURSELF_DESCRIPTOR)}
									maxWidth="xl"
									data-flx="user.profile.profile-preview.tooltip"
								>
									<div
										className={styles.messageButtonWrapper}
										data-flx="user.profile.profile-preview.message-button-wrapper"
									>
										<Button
											small={true}
											fitContainer={true}
											leftIcon={
												<ChatTeardropIcon
													className={styles.messageIcon}
													data-flx="user.profile.profile-preview.message-icon"
												/>
											}
											disabled={true}
											data-flx="user.profile.profile-preview.button"
										>
											<Trans context="message-action">Message</Trans>
										</Button>
									</div>
								</Tooltip>
							</ProfileCardFooter>
						)}
						{expandedCard && !compact && !showMessageButton && !editorControls && (
							<ProfileCardFooter data-flx="user.profile.profile-preview.profile-card-footer">
								<div className={styles.popoutFooterActions}>
									<button
										type="button"
										className={styles.popoutEditButton}
										onClick={onEditIdentity ?? openMockProfile}
										data-flx="user.profile.profile-preview.edit-profile-btn"
									>
										<div className={styles.popoutButtonRow}>
											<PencilIcon size={14} weight="bold" />
											<span><Trans>Edit Profile</Trans></span>
										</div>
									</button>
									<button
										type="button"
										className={styles.popoutCopyIdButton}
										onClick={() => {
											if (user?.id) {
												void navigator.clipboard?.writeText(user.id);
											}
										}}
										data-flx="user.profile.profile-preview.copy-id-btn"
									>
										<div className={styles.popoutButtonRow}>
											<span><Trans>Copy User ID</Trans></span>
										</div>
										<IdentificationBadgeIcon size={14} weight="bold" />
									</button>
								</div>
							</ProfileCardFooter>
						)}
					</ProfileCardLayout>
				</div>
			</FocusRing>
		);
	},
);
