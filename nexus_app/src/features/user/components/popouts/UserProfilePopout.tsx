// SPDX-License-Identifier: Nebula

import {UserSettingsModal} from '@app/features/app/components/dialogs/LoadableSettingsModals';
import {CustomStatusDisplay} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import {useHover} from '@app/features/app/hooks/useHover';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import Authentication from '@app/features/auth/state/Authentication';
import DeveloperOptions from '@app/features/devtools/state/DeveloperOptions';
import {OPEN_DM_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import type {GuildMember} from '@app/features/member/models/GuildMember';
import GuildMembers from '@app/features/member/state/GuildMembers';
import Permission from '@app/features/permissions/state/Permission';
import {Logger} from '@app/features/platform/utils/AppLogger';
import {usePresenceCustomStatus} from '@app/features/presence/hooks/usePresenceCustomStatus';
import MemberPresenceSubscription from '@app/features/presence/state/MemberPresenceSubscription';
import Relationships from '@app/features/relationship/state/Relationships';
import {
	getUserMenuAvatarUrl,
	getUserMenuBannerUrl,
	UserImageMenuItems,
} from '@app/features/ui/action_menu/items/UserImageMenuItems';
import {Button} from '@app/features/ui/button/Button';
import * as ContextMenuCommands from '@app/features/ui/commands/ContextMenuCommands';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import * as PopoutCommands from '@app/features/ui/commands/PopoutCommands';
import FocusRingScope from '@app/features/ui/focus_ring/FocusRingScope';
import {CustomStatusModal} from '@app/features/user/components/modals/CustomStatusModal';
import * as UserProfileCommands from '@app/features/user/commands/UserProfileCommands';
import {LimitedProfileNotice} from '@app/features/user/components/popouts/LimitedProfileNotice';
import {UserProfileBadges} from '@app/features/user/components/popouts/UserProfileBadges';
import {UserProfileDataWarning} from '@app/features/user/components/popouts/UserProfileDataWarning';
import {GamingActivityCard} from '@app/features/gaming/GamingActivityCard';
import styles from '@app/features/user/components/popouts/UserProfilePopout.module.css';
import {
	UserProfileConnections,
	UserProfileMembershipInfo,
	UserProfilePreviewBio,
	UserProfileRoles,
	UserProfileTimezoneInfo,
} from '@app/features/user/components/popouts/UserProfileShared';
import {ProfileCardActions} from '@app/features/user/components/profile/profile_card/ProfileCardActions';
import {ProfileCardBanner} from '@app/features/user/components/profile/profile_card/ProfileCardBanner';
import {ProfileCardContent} from '@app/features/user/components/profile/profile_card/ProfileCardContent';
import {ProfileCardFooter} from '@app/features/user/components/profile/profile_card/ProfileCardFooter';
import profileHeroStyles from '@app/features/user/components/profile/profile_card/ProfileCardHero.module.css';
import {ProfileCardLayout} from '@app/features/user/components/profile/profile_card/ProfileCardLayout';
import {ProfileCardUserInfo} from '@app/features/user/components/profile/profile_card/ProfileCardUserInfo';
import {UserProfileLoadingSkeleton} from '@app/features/user/components/profile/UserProfileLoadingSkeleton';
import {useProfileCardDisplayState} from '@app/features/user/components/profile/useProfileCardDisplayState';
import {VoiceActivitySection} from '@app/features/user/components/profile/VoiceActivitySection';
import {PROFILE_POPOUT_GEOMETRY_STYLE} from '@app/features/user/constants/UserProfileSurfaceGeometry';
import {useAutoplayExpandedProfileAnimations} from '@app/features/user/hooks/useAutoplayExpandedProfileAnimations';
import {useUserProfileSurfaceState} from '@app/features/user/hooks/useUserProfileSurfaceState';
import type {User} from '@app/features/user/models/User';
import {blockedDmConfirmModal, openDMChannelOrShowError} from '@app/features/user/utils/DMActionUtils';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import * as ProfileDisplayUtils from '@app/features/user/utils/ProfileDisplayUtils';
import {resolveProfileGuildMembership} from '@app/features/user/utils/ProfileGuildMembership';
import {createMockProfile} from '@app/features/user/utils/ProfileUtils';
import {Trans, useLingui} from '@lingui/react/macro';
import {Permissions} from '@nexus/constants/src/ChannelConstants';
import {MEDIA_PROXY_PROFILE_BANNER_SIZE_POPOUT} from '@nexus/constants/src/MediaProxyAssetSizes';
import {RelationshipTypes} from '@nexus/constants/src/UserConstants';
import {ChatTeardropIcon, IdentificationBadgeIcon, PencilIcon} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useCallback, useEffect, useMemo, useRef} from 'react';

const logger = new Logger('UserProfilePopout');

interface UserProfilePopoutProps {
	popoutKey: string | number;
	user: User;
	isWebhook: boolean;
	guildId?: string;
	guildMember?: GuildMember | null;
	onClose?: () => void;
}

export const UserProfilePopout: React.FC<UserProfilePopoutProps> = observer(
	({popoutKey, user, isWebhook, guildId, guildMember: providedGuildMember, onClose}) => {
		const {i18n} = useLingui();
		const [hoverRef, isHovering] = useHover();
		const storedGuildMember = guildId ? GuildMembers.getMember(guildId, user.id) : null;
		const profileGuildId = isWebhook ? undefined : guildId;
		const fallbackProfile = useMemo(() => createMockProfile(user), [user]);
		const handleProfileLoadError = useCallback((error: unknown) => {
			logger.error('Failed to fetch profile for user popout', error);
		}, []);
		const {profile, profileLoadError, showProfileSkeleton} = useUserProfileSurfaceState({
			userId: user.id,
			guildId: profileGuildId,
			enabled: !isWebhook,
			fallbackProfile,
			onError: handleProfileLoadError,
		});
		const showProfileDataWarning =
			!showProfileSkeleton && !isWebhook && (profileLoadError || DeveloperOptions.forceProfileDataWarning);
		const profileMembership = resolveProfileGuildMembership(profile, {
			fallbackGuildId: guildId,
			userId: user.id,
			allowStoreFallback: true,
		});
		const profileGuildMember = profileMembership.kind === 'guildMember' ? profileMembership.member : null;
		const guildMember =
			profile?.guildId && profile.guildId === guildId
				? (profileGuildMember ?? storedGuildMember ?? providedGuildMember)
				: profileGuildMember;
		const memberRoles =
			profileMembership.kind === 'guildMember' && profileMembership.member === guildMember
				? profileMembership.roles
				: (guildMember?.getSortedRoles() ?? []);
		const canManageRoles = Permission.can(Permissions.MANAGE_ROLES, {guildId});
		const isCurrentUser = user.id === Authentication.currentUserId;
		const relationshipType = Relationships.getRelationship(user.id)?.type;
		const isBlocked = relationshipType === RelationshipTypes.BLOCKED;
		const directMessagesDisabled = RuntimeConfig.directMessagesDisabled;
		const showProfileFooter = !isWebhook && (isCurrentUser || !directMessagesDisabled);
		const requestClose = useCallback(() => {
			if (onClose) {
				onClose();
				return;
			}
			PopoutCommands.close(popoutKey);
		}, [onClose, popoutKey]);
		const openFullProfile = useCallback(
			(autoFocusNote?: boolean) => {
				if (isWebhook) {
					return;
				}
				UserProfileCommands.openUserProfile(user.id, guildId, autoFocusNote);
				requestClose();
			},
			[isWebhook, user.id, guildId, requestClose],
		);
		const handleOpenFullProfile = useCallback(() => {
			openFullProfile();
		}, [openFullProfile]);
		const handleOpenFullProfileNote = useCallback(() => {
			openFullProfile(true);
		}, [openFullProfile]);
		useEffect(() => {
			if (!guildId || !user.id || isWebhook) {
				return;
			}
			if (providedGuildMember) {
				MemberPresenceSubscription.touchMember(guildId, user.id);
				return () => {
					MemberPresenceSubscription.unsubscribe(guildId, user.id);
				};
			}
			const hasMember = GuildMembers.getMember(guildId, user.id);
			if (!hasMember) {
				MemberPresenceSubscription.touchMember(guildId, user.id);
				GuildMembers.fetchMembers(guildId, {userIds: [user.id]}).catch((error) => {
					logger.error('Failed to fetch guild member', error);
				});
			} else {
				MemberPresenceSubscription.touchMember(guildId, user.id);
			}
			return () => {
				MemberPresenceSubscription.unsubscribe(guildId, user.id);
			};
		}, [guildId, user.id, isWebhook, providedGuildMember]);
		const handleClosePopout = useCallback(() => {
			requestClose();
		}, [requestClose]);
		const displayName = guildMember?.nick
			? NicknameUtils.formatNicknameForStreamerMode(guildMember.nick)
			: NicknameUtils.getNickname(user, guildId);
		const handleMessage = async () => {
			requestClose();
			await openDMChannelOrShowError(user.id);
		};
		const handleOpenBlockedDm = () => {
			ModalCommands.push(
				blockedDmConfirmModal(
					i18n,
					displayName,
					handleMessage,
					'user.user-profile-popout.handle-open-blocked-dm.confirm-modal',
				),
			);
		};
		const handleEditProfile = () => {
			ModalCommands.push(
				modal(
					() => (
						<UserSettingsModal
							initialTab="my_profile"
							data-flx="user.user-profile-popout.handle-edit-profile.user-settings-modal"
						/>
					),
					'user-settings',
				),
			);
			requestClose();
		};
		const {profileContext, avatarUrl, hoverAvatarUrl, bannerUrl, hoverBannerUrl, accentColor, profileData} =
			useProfileCardDisplayState({
				user,
				profile,
				guildId: profile?.guildId,
				guildMember,
				guildMemberProfile: profile?.guildMemberProfile,
				bannerSize: MEDIA_PROXY_PROFILE_BANNER_SIZE_POPOUT,
			});
		const avatarMenuUrl = getUserMenuAvatarUrl({user, profile, profileContext});
		const bannerMenuUrl = getUserMenuBannerUrl({user, profile, profileContext});
		const handleAvatarContextMenu = useCallback(
			(event: React.MouseEvent) => {
				if (isWebhook || !avatarMenuUrl) return;
				ContextMenuCommands.openFromEvent(event, ({onClose}) => (
					<UserImageMenuItems
						user={user}
						profile={profile}
						profileContext={profileContext}
						onClose={onClose}
						variant="avatar"
						data-flx="user.user-profile-popout.handle-avatar-context-menu.user-image-menu-items"
					/>
				));
			},
			[isWebhook, avatarMenuUrl, user, profile, profileContext],
		);
		const handleBannerContextMenu = useCallback(
			(event: React.MouseEvent) => {
				if (isWebhook || !bannerMenuUrl) return;
				ContextMenuCommands.openFromEvent(event, ({onClose}) => (
					<UserImageMenuItems
						user={user}
						profile={profile}
						profileContext={profileContext}
						onClose={onClose}
						variant="banner"
						data-flx="user.user-profile-popout.handle-banner-context-menu.user-image-menu-items"
					/>
				));
			},
			[isWebhook, bannerMenuUrl, user, profile, profileContext],
		);
		const shouldAutoplayProfileAnimations = useAutoplayExpandedProfileAnimations();
		const presenceCustomStatus = usePresenceCustomStatus({userId: user.id, enabled: !isWebhook});
		const openCustomStatus = useCallback(() => {
			ModalCommands.push(
				modal(() => (
					<CustomStatusModal data-flx="user.user-profile-popout.open-custom-status.custom-status-modal" />
				)),
			);
			requestClose();
		}, [requestClose]);
		const popoutContainerRef = useRef<HTMLDivElement | null>(null);
		if (showProfileSkeleton) {
			return (
				<FocusRingScope containerRef={popoutContainerRef} data-flx="user.user-profile-popout.skeleton.focus-ring-scope">
					<div ref={popoutContainerRef} data-flx="user.user-profile-popout.skeleton.container">
						<UserProfileLoadingSkeleton
							variant="popout"
							borderColor={accentColor}
							data-flx="user.user-profile-popout.user-profile-loading-skeleton"
						/>
					</div>
				</FocusRingScope>
			);
		}
		const appearance = ProfileDisplayUtils.getProfileAppearance(profile?.getEffectiveProfile().profile_appearance);
		const profileMediaLayers = ProfileDisplayUtils.getProfileMediaLayers(
			profile?.userProfile.profile_appearance ?? user.profileAppearance,
			profile?.guildMemberProfile?.profile_appearance,
		);
		const profileEffectId = profileMediaLayers.profileEffectIds.at(-1) ?? null;
const profileFrameLayers = isWebhook ? [] : profileMediaLayers.cardFrameIds;
const {borderColor, coverColor: bannerColor} = ProfileDisplayUtils.getProfileSurfaceColors(
isWebhook ? null : appearance,
accentColor,
);
		const profileCardGeometryStyle = {
			...PROFILE_POPOUT_GEOMETRY_STYLE,
			'--profile-popout-content-width': 'min(350px, calc(100vw - 1rem))',
			'--profile-sheet-accent': accentColor,
		} as typeof PROFILE_POPOUT_GEOMETRY_STYLE;
		const profileCardClassName = isCurrentUser
			? `${styles.profilePopoutCard} ${styles.profilePopoutCardSelf}`
			: `${styles.profilePopoutCard} ${styles.profilePopoutCardMember}`;
		return (
			<FocusRingScope containerRef={popoutContainerRef} data-flx="user.user-profile-popout.focus-ring-scope">
				<div ref={popoutContainerRef} data-flx="user.user-profile-popout.div">
					<ProfileCardLayout
						borderColor={borderColor}
						appearance={isWebhook ? null : appearance}
						profileEffectId={profileEffectId}
						profileEffectLayers={profileMediaLayers.profileEffectIds}
profileFrameLayers={profileFrameLayers}
						hoverRef={hoverRef}
						className={profileCardClassName}
						style={profileCardGeometryStyle}
						data-flx="user.user-profile-popout.profile-card-layout"
					>
						<div className={profileHeroStyles.profileHero}>
							<ProfileCardBanner
								variant="expanded"
								bannerUrl={bannerUrl as string | null}
								hoverBannerUrl={hoverBannerUrl}
								bannerColor={bannerColor}
								user={user}
								avatarUrl={avatarUrl}
								appearance={isWebhook ? null : appearance}
								hoverAvatarUrl={hoverAvatarUrl}
								disablePresence={isWebhook}
								isClickable={!isWebhook}
								onAvatarClick={!isWebhook ? handleOpenFullProfile : undefined}
								onAvatarContextMenu={handleAvatarContextMenu}
								onBannerContextMenu={handleBannerContextMenu}
								data-flx="user.user-profile-popout.profile-card-banner"
							/>
							<div className={profileHeroStyles.profileHeroIdentity}>
								<ProfileCardUserInfo
									displayName={displayName}
									appearance={isWebhook ? null : appearance}
									nameplateSettings={profile?.getEffectiveProfile().profile_appearance?.nameplateSettings}
									displayNameClassName={styles.profileDisplayName}
									user={user}
									pronouns={profileData?.pronouns}
									showUsername={!isWebhook}
									isClickable={!isWebhook}
									isWebhook={isWebhook}
									onDisplayNameClick={!isWebhook ? handleOpenFullProfile : undefined}
									onUsernameClick={!isWebhook ? handleOpenFullProfile : undefined}
									data-flx="user.user-profile-popout.profile-card-user-info"
								/>
								{!isWebhook && (presenceCustomStatus || isCurrentUser) && (
									<div className={styles.profileCustomStatus} data-flx="user.user-profile-popout.profile-custom-status">
										<CustomStatusDisplay
											customStatus={presenceCustomStatus}
											className={styles.profileCustomStatusText}
											allowJumboEmoji
											maxLines={0}
											showPlaceholder={isCurrentUser}
											isEditable={isCurrentUser}
											onEdit={openCustomStatus}
											alwaysAnimate={shouldAutoplayProfileAnimations}
											data-flx="user.user-profile-popout.profile-custom-status-text"
										/>
									</div>
								)}
							</div>
							{!isWebhook && (
								<div className={styles.profileHeroActions} data-flx="user.user-profile-popout.profile-card-actions">
									<ProfileCardActions
										userId={user.id}
										isHovering={isHovering}
										onNoteClick={handleOpenFullProfileNote}
									/>
								</div>
							)}
						</div>
						{!isWebhook && (
							<UserProfileBadges
								user={user}
								profile={profile}
								data-flx="user.user-profile-popout.user-profile-badges"
							/>
						)}
						<ProfileCardContent isWebhook={isWebhook} data-flx="user.user-profile-popout.profile-card-content">
							{showProfileDataWarning && (
								<div className={styles.profileDataWarning} data-flx="user.user-profile-popout.profile-data-warning">
									<UserProfileDataWarning data-flx="user.user-profile-popout.user-profile-data-warning" />
								</div>
							)}
							{!isWebhook && profile?.profileLimited && (
								<div className={styles.profileDataWarning} data-flx="user.user-profile-popout.profile-limited-notice">
									<LimitedProfileNotice data-flx="user.user-profile-popout.limited-profile-notice" />
								</div>
							)}
							{!isWebhook && (
								<VoiceActivitySection
									userId={user.id}
									onNavigate={handleClosePopout}
									data-flx="user.user-profile-popout.voice-activity-section"
								/>
							)}
			{!isWebhook && <GamingActivityCard guildId={guildId} userId={user.id} />}
							{profile && (
								<UserProfilePreviewBio
									profile={profile}
									profileData={profileData ?? null}
									onShowMore={handleOpenFullProfile}
									data-flx="user.user-profile-popout.user-profile-preview-bio"
								/>
							)}
							{profile && (
								<UserProfileTimezoneInfo
									profile={profile}
									data-flx="user.user-profile-popout.user-profile-timezone-info"
								/>
							)}
							{profile && (
								<UserProfileMembershipInfo
									profile={profile}
									user={user}
									data-flx="user.user-profile-popout.user-profile-membership-info"
								/>
							)}
							{!isWebhook && profile && (
								<UserProfileRoles
									profile={profile}
									user={user}
									memberRoles={[...memberRoles]}
									canManageRoles={canManageRoles}
									data-flx="user.user-profile-popout.user-profile-roles"
								/>
							)}
							{profile && (
								<UserProfileConnections
									profile={profile}
									variant="compact"
									data-flx="user.user-profile-popout.user-profile-connections"
								/>
							)}
						</ProfileCardContent>
						{showProfileFooter && (
							<ProfileCardFooter data-flx="user.user-profile-popout.profile-card-footer">
								{isCurrentUser ? (
									<div className={styles.popoutFooterActions}>
										<Button
											className={styles.glassActionButton}
											small={true}
											fitContainer={true}
											leftIcon={
												<PencilIcon className={styles.iconSmall} data-flx="user.user-profile-popout.icon-small--2" />
											}
											onClick={handleEditProfile}
											data-flx="user.user-profile-popout.button.edit-profile"
										>
											<Trans>Edit Profile</Trans>
										</Button>
										<Button
											className={styles.glassActionButton}
											small={true}
											fitContainer={true}
											rightIcon={
												<IdentificationBadgeIcon className={styles.iconSmall} />
											}
											onClick={() => {
												if (user?.id) {
													void navigator.clipboard?.writeText(user.id);
												}
											}}
											data-flx="user.user-profile-popout.button.copy-user-id"
										>
											<Trans>Copy User ID</Trans>
										</Button>
									</div>
								) : (
									<div className={styles.messageFooterActions}>
										<Button
											className={styles.glassActionButton}
											small={true}
											square={true}
											variant="secondary"
											icon={
												<ChatTeardropIcon
													className={styles.iconSmall}
													data-flx="user.user-profile-popout.icon-small--3"
												/>
											}
											aria-label={i18n._(OPEN_DM_DESCRIPTOR)}
											title={i18n._(OPEN_DM_DESCRIPTOR)}
											onClick={isBlocked ? handleOpenBlockedDm : handleMessage}
											data-flx="user.user-profile-popout.button.open-blocked-dm"
										/>
									</div>
								)}
							</ProfileCardFooter>
						)}
					</ProfileCardLayout>
				</div>
			</FocusRingScope>
		);
	},
);
