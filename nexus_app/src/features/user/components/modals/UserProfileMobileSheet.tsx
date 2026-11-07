// SPDX-License-Identifier: Nebula

import {Routes} from '@app/app/Routes';
import {UserSettingsModal} from '@app/features/app/components/dialogs/LoadableSettingsModals';
import {getStatusTypeLabel} from '@app/features/app/constants/AppConstants';
import {
	CustomStatusDisplay,
	type EmojiPressData,
} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import {openAccountSwitcherModal} from '@app/features/auth/commands/AccountSwitcherModalCommands';
import Authentication from '@app/features/auth/state/Authentication';
import Channels from '@app/features/channel/state/Channels';
import {ExpressionInfoBottomSheet} from '@app/features/expressions/components/bottomsheets/ExpressionInfoBottomSheet';
import {OPEN_DM_DESCRIPTOR, SETTINGS_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import GuildMembers from '@app/features/member/state/GuildMembers';
import SelectedChannel from '@app/features/navigation/state/SelectedChannel';
import Permission from '@app/features/permissions/state/Permission';
import {Logger} from '@app/features/platform/utils/AppLogger';
import MemberPresenceSubscription from '@app/features/presence/state/MemberPresenceSubscription';
import Presence from '@app/features/presence/state/Presence';
import {
	getUserMenuAvatarUrl,
	getUserMenuBannerUrl,
	UserImageMenuItems,
} from '@app/features/ui/action_menu/items/UserImageMenuItems';
import * as RelationshipCommands from '@app/features/relationship/commands/RelationshipCommands';
import Relationships from '@app/features/relationship/state/Relationships';
import * as RelationshipActionUtils from '@app/features/relationship/utils/RelationshipActionUtils';
import {
	ACCEPT_FRIEND_REQUEST_DESCRIPTOR,
	CANCEL_FRIEND_REQUEST_DESCRIPTOR,
	REMOVE_FRIEND_DESCRIPTOR,
} from '@app/features/relationship/utils/RelationshipMessageDescriptors';
import StreamerMode from '@app/features/streamer_mode/state/StreamerMode';
import {getUserAccentColor} from '@app/features/theme/utils/AccentColorUtils';
import {BottomSheet} from '@app/features/ui/bottom_sheet/BottomSheet';
import * as ContextMenuCommands from '@app/features/ui/commands/ContextMenuCommands';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import {Scroller} from '@app/features/ui/components/Scroller';
import {Spinner} from '@app/features/ui/components/Spinner';
import {StatusIndicator} from '@app/features/ui/components/StatusIndicator';
import {MenuBottomSheet, type MenuGroupType} from '@app/features/ui/menu_bottom_sheet/MenuBottomSheet';
import * as Sheet from '@app/features/ui/sheet/Sheet';
import * as UserProfileCommands from '@app/features/user/commands/UserProfileCommands';
import {openUserSettingsModal} from '@app/features/user/commands/UserSettingsModalCommands';
import {MutualItemsSheet} from '@app/features/user/components/modals/MutualItemsSheet';
import {NoteEditSheet} from '@app/features/user/components/modals/NoteEditSheet';
import {UserProfileActionsSheet} from '@app/features/user/components/modals/UserProfileActionsSheet';
import {createNamedLoadableComponent} from '@app/features/platform/components/loadable/LoadableComponent';
import {GamingActivityCard} from '@app/features/gaming/GamingActivityCard';
import {ProfileCardBanner} from '@app/features/user/components/profile/profile_card/ProfileCardBanner';
import cardEffects from '@app/features/user/components/profile/profile_card/ProfileCardLayout.module.css';
import styles from '@app/features/user/components/modals/UserProfileMobileSheet.module.css';
import {getContrastingNotchColor} from '@app/features/user/components/modals/UserProfileUtils';
import {getMutualItemsDescriptor} from '@app/features/user/components/modals/user_profile_modal/MutualItemsDescriptors';
import {
	getMutualCommunityDisplayItems,
	getMutualGroupChannels,
} from '@app/features/user/components/modals/user_profile_modal/MutualItemsUtils';
import {UserProfileBadges} from '@app/features/user/components/popouts/UserProfileBadges';
import {
	UserProfileBio,
	UserProfileConnections,
	UserProfileMembershipInfo,
	UserProfileRoles,
	UserProfileTimezoneInfo,
} from '@app/features/user/components/popouts/UserProfileShared';
import {useAutoplayExpandedProfileAnimations} from '@app/features/user/hooks/useAutoplayExpandedProfileAnimations';
import {getNameEffectSettings} from '@app/features/user/components/profile/studio/nameStyleColors';
import type {Profile} from '@app/features/user/models/Profile';
import {ProfileEffectMedia, ProfileFrameMedia} from '@app/features/user/components/profile/media/ProfileMedia';
import {User} from '@app/features/user/models/User';
import UserNote from '@app/features/user/state/UserNote';
import UserProfile from '@app/features/user/state/UserProfile';
import UserProfileMobile from '@app/features/user/state/UserProfileMobile';
import Users from '@app/features/user/state/Users';
import {blockedDmConfirmModal, openDMChannelOrShowError} from '@app/features/user/utils/DMActionUtils';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import * as ProfileDisplayUtils from '@app/features/user/utils/ProfileDisplayUtils';
import {
	getProfileMembershipDisplayName,
	resolveProfileGuildMembership,
	toProfileDisplayContext,
} from '@app/features/user/utils/ProfileGuildMembership';
import {createMockProfile} from '@app/features/user/utils/ProfileUtils';
import {SEND_FRIEND_REQUEST_DESCRIPTOR, UNBLOCK_USER_DESCRIPTOR} from '@app/features/user/utils/UserMessageDescriptors';
import {shouldShowDiscriminator} from '@app/features/user/utils/UserTagUtils';
import * as CallUtils from '@app/features/voice/utils/CallUtils';
import {hasActiveDirectCallWithUser} from '@app/features/voice/utils/PrivateCallMenuUtils';
import {ME} from '@nexus/constants/src/AppConstants';
import {Permissions} from '@nexus/constants/src/ChannelConstants';
import {
	MEDIA_PROXY_AVATAR_SIZE_DEFAULT,
	MEDIA_PROXY_PROFILE_BANNER_SIZE_MODAL,
} from '@nexus/constants/src/MediaProxyAssetSizes';
import {PublicUserFlags, RelationshipTypes} from '@nexus/constants/src/UserConstants';
import {StatusTypes} from '@nexus/constants/src/StatusConstants';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {
	CaretDownIcon,
	ChatTeardropIcon,
	CheckCircleIcon,
	ClockCounterClockwiseIcon,
	DotsThreeIcon,
	GearIcon,
	NotePencilIcon,
	PencilIcon,
	PhoneIcon,
	PlusIcon,
	ProhibitIcon,
	UserMinusIcon,
	UserPlusIcon,
	UsersThreeIcon,
	VideoCameraIcon,
} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

const logger = new Logger('UserProfileMobileSheet');
const SWITCH_ACCOUNTS_DESCRIPTOR = msg({
	message: 'Switch accounts',
	comment: 'Action that opens the account switcher from the mobile profile.',
});
const SET_STATUS_DESCRIPTOR = msg({
	message: 'Set status',
	comment: 'Accessible label for the status control on the mobile profile.',
});
const ADD_ACCOUNT_DESCRIPTOR = msg({
	message: 'Add account',
	comment: 'Accessible label for adding an account from the mobile profile.',
});
const StatusChangeBottomSheet = createNamedLoadableComponent<{
	isOpen: boolean;
	onClose: () => void;
}>({
	displayName: 'StatusChangeBottomSheet',
	load: async () =>
		(await import('@app/features/user/components/modals/StatusChangeBottomSheet')).StatusChangeBottomSheet,
});

export const UserProfileMobileSheet: React.FC = observer(function UserProfileMobileSheet() {
	const store = UserProfileMobile;
	const {userId, guildId: explicitGuildId, autoFocusNote, isOpen} = store;
	const selectedChannelId = SelectedChannel.currentChannelId;
	const selectedChannel = selectedChannelId ? Channels.getChannel(selectedChannelId) : null;
	const channelGuildId =
		selectedChannel?.guildId && selectedChannel.guildId !== ME ? selectedChannel.guildId : undefined;
	const guildId = explicitGuildId ?? channelGuildId;
	const storeUser = userId ? Users.getUser(userId) : null;
	const user = storeUser;
	const fallbackUser = useMemo(
		() =>
			userId
				? new User({
						id: userId,
						username: userId,
						discriminator: '0000',
						global_name: null,
						avatar: null,
						avatar_color: null,
						flags: 0,
					})
				: null,
		[userId],
	);
	const displayUser = user ?? fallbackUser;
	const fallbackProfile = useMemo(() => (fallbackUser ? createMockProfile(fallbackUser) : null), [fallbackUser]);
	const mockProfile = useMemo(() => (user ? createMockProfile(user) : null), [user]);
	const initialProfile = userId ? UserProfile.getProfile(userId, guildId) : null;
	const [profile, setProfile] = useState<Profile | null>(initialProfile);
	const [isProfileLoading, setIsProfileLoading] = useState(() => !initialProfile);
	const profileMatchesContext = profile?.userId === userId && (profile?.guildId ?? null) === (guildId ?? null);
	const activeProfile = profileMatchesContext ? profile : initialProfile;
	const isContextSwitching = Boolean(userId && profile && !profileMatchesContext);
	const shouldShowProfileLoading = isProfileLoading && (!activeProfile || isContextSwitching);
	useEffect(() => {
		setProfile(initialProfile);
		setIsProfileLoading(!initialProfile);
	}, [initialProfile]);
	useEffect(() => {
		if (!userId || activeProfile) {
			setIsProfileLoading(false);
			return;
		}
		let cancelled = false;
		setIsProfileLoading(true);
		UserProfileCommands.fetch(userId, guildId)
			.then(() => {
				if (cancelled) return;
				const fetchedProfile = UserProfile.getProfile(userId, guildId);
				if (fetchedProfile) {
					setProfile(fetchedProfile);
				}
			})
			.catch((error) => {
				if (cancelled) return;
				logger.error('Failed to fetch user profile:', error);
			})
			.finally(() => {
				if (cancelled) return;
				setIsProfileLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [userId, guildId, activeProfile]);
	useEffect(() => {
		if (!guildId || !userId) {
			return;
		}
		const hasMember = GuildMembers.getMember(guildId, userId);
		if (!hasMember) {
			MemberPresenceSubscription.touchMember(guildId, userId);
			GuildMembers.fetchMembers(guildId, {userIds: [userId]}).catch((error) => {
				logger.error(' Failed to fetch guild member:', error);
			});
		} else {
			MemberPresenceSubscription.touchMember(guildId, userId);
		}
		return () => {
			MemberPresenceSubscription.unsubscribe(guildId, userId);
		};
	}, [guildId, userId]);
	if (!isOpen || !displayUser) {
		return null;
	}
	const effectiveProfile: Profile | null = activeProfile ?? mockProfile ?? fallbackProfile;
	const resolvedProfile: Profile = effectiveProfile ?? fallbackProfile!;
	const userNote = userId ? UserNote.getUserNote(userId) : null;
	const handleClose = () => {
		store.close();
	};
	const profileIdentityKey = `${displayUser.id}:${guildId ?? 'global'}`;
	return (
		<UserProfileMobileSheetContent
			key={profileIdentityKey}
			user={displayUser}
			profile={resolvedProfile}
			userNote={userNote}
			guildId={guildId}
			autoFocusNote={autoFocusNote}
			isLoading={shouldShowProfileLoading}
			onClose={handleClose}
			data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content"
		/>
	);
});

interface UserProfileMobileSheetContentProps {
	user: User;
	profile: Profile;
	userNote: string | null;
	guildId?: string;
	autoFocusNote?: boolean;
	isLoading: boolean;
	onClose: () => void;
}

interface EmojiInfoState {
	id?: string;
	name: string;
	animated?: boolean;
}

const UserProfileMobileSheetContent: React.FC<UserProfileMobileSheetContentProps> = observer(
	function UserProfileMobileSheetContent({user, profile, userNote, guildId, autoFocusNote, isLoading, onClose}) {
		const {i18n} = useLingui();
		const [noteSheetOpen, setNoteSheetOpen] = useState(false);
		const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
		const [statusSheetOpen, setStatusSheetOpen] = useState(false);
		const [accountActionsOpen, setAccountActionsOpen] = useState(false);
		const [showGlobalProfile, setShowGlobalProfile] = useState(false);
		const [emojiInfoOpen, setEmojiInfoOpen] = useState(false);
		const [selectedEmoji, setSelectedEmoji] = useState<EmojiInfoState | null>(null);
		const [mutualSheetView, setMutualSheetView] = useState<'friends' | 'communities_groups' | null>(null);
		const profileHeaderRef = useRef<HTMLDivElement>(null);
		const profileCardRef = useRef<HTMLDivElement>(null);
		const [profileHeaderWidth, setProfileHeaderWidth] = useState(0);
		const hidePrivateDetails = StreamerMode.shouldHidePersonalInformation;
		const isCurrentUser = user.id === Authentication.currentUserId;
		const status = Presence.getStatus(user.id) ?? StatusTypes.ONLINE;
		const openAccountSwitcher = () => {
			openAccountSwitcherModal(
				{
					closeCurrentAccountOnSelect: true,
					initialReloginAccount: null,
					redirectAfterLogin: null,
					redirectAfterSwitch: Routes.ME,
					switchAccount: null,
					'data-flx': 'user.user-profile-mobile-sheet.account-switcher-modal',
				},
				null,
			);
		};
		const openStatusPickerFromActions = () => {
			ModalCommands.runAfterBottomSheetClose(
				() => setAccountActionsOpen(false),
				() => setStatusSheetOpen(true),
			);
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
		const relationship = Relationships.getRelationship(user.id);
		const relationshipType = relationship?.type;
		const isBlocked = relationshipType === RelationshipTypes.BLOCKED;
		const hasActiveDirectCall = hasActiveDirectCallWithUser(user.id);
		const currentUserUnclaimed = !(Users.currentUser?.isClaimed() ?? true);
		const profileMembership = resolveProfileGuildMembership(profile, {
			fallbackGuildId: guildId,
			userId: user.id,
			allowStoreFallback: true,
		});
		const guildMember = profileMembership.kind === 'guildMember' ? profileMembership.member : null;
		const memberRoles = profileMembership.kind === 'guildMember' ? profileMembership.roles : [];
		const canManageRoles = Permission.can(Permissions.MANAGE_ROLES, {guildId: profile?.guildId ?? guildId});
		const mutualFriendsCount = !user.bot ? (profile?.mutualFriends?.length ?? 0) : 0;
		const mutualCommunityDisplayItems = getMutualCommunityDisplayItems(profile?.mutualGuilds ?? []);
		const mutualCommunitiesCount = mutualCommunityDisplayItems.length;
		const mutualGroups = getMutualGroupChannels(user.id);
		const mutualGroupsCount = mutualGroups.length;
		const mutualCommunitiesGroupsCount = mutualCommunitiesCount + mutualGroupsCount;
		const hasMutuals = mutualFriendsCount > 0 || mutualCommunitiesGroupsCount > 0;
		const hasGuildProfile = !!(profile?.guildId && profile?.guildMemberProfile);
		const shouldShowGuildProfile = hasGuildProfile && !showGlobalProfile;
		const displayMembership = shouldShowGuildProfile ? profileMembership : resolveProfileGuildMembership(null);
		const profileContext = useMemo<ProfileDisplayUtils.ProfileDisplayContext>(
			() =>
				toProfileDisplayContext({
					user,
					profile,
					membership: displayMembership,
					guildMemberProfile: shouldShowGuildProfile ? profile?.guildMemberProfile : undefined,
				}),
			[user, profile, displayMembership, shouldShowGuildProfile],
		);
		const shouldAutoplayProfileAnimations = useAutoplayExpandedProfileAnimations();
		const {avatarUrl, hoverAvatarUrl} = useMemo(
			() => ProfileDisplayUtils.getProfileAvatarUrls(profileContext, undefined, MEDIA_PROXY_AVATAR_SIZE_DEFAULT),
			[profileContext],
		);
		const {bannerUrl: staticBannerUrl, hoverBannerUrl} = useMemo(
			() => ProfileDisplayUtils.getProfileBannerUrls(profileContext, undefined, MEDIA_PROXY_PROFILE_BANNER_SIZE_MODAL),
			[profileContext],
		);
		const effectiveProfile = useMemo(() => {
			if (showGlobalProfile) {
				return profile?.userProfile ?? null;
			}
			return profile?.getEffectiveProfile() ?? null;
		}, [profile, showGlobalProfile]);
		const profileForHeader = useMemo(() => {
			if (showGlobalProfile && hasGuildProfile) {
				return profile.withUpdates({guild_member_profile: null}).withGuildId(null);
			}
			return profile;
		}, [profile, showGlobalProfile, hasGuildProfile]);
const profileMediaLayers = ProfileDisplayUtils.getProfileMediaLayers(
profileForHeader?.userProfile.profile_appearance ?? user.profileAppearance,
profileForHeader?.guildMemberProfile?.profile_appearance,
);
const profileEffectId = profileMediaLayers.profileEffectIds.at(-1) ?? null;
const profileFrameId = profileMediaLayers.cardFrameIds.at(-1) ?? 'none';
		const avatarMenuUrl = getUserMenuAvatarUrl({user, profile: profileForHeader, profileContext});
		const bannerMenuUrl = getUserMenuBannerUrl({user, profile: profileForHeader, profileContext});
		const displayName = getProfileMembershipDisplayName(user, displayMembership);
		const appearance = ProfileDisplayUtils.getProfileAppearance(effectiveProfile?.profile_appearance);
		const nameEffectSettings = appearance ? getNameEffectSettings(appearance) : null;
		const mobileAvatarSize = Math.round(((profileHeaderWidth || 310) * 64) / 310);
		const bannerColor = useMemo(
			() => getUserAccentColor(user, effectiveProfile?.accent_color),
			[user, effectiveProfile],
		);
const profileSurfaceColors = useMemo(
() => ProfileDisplayUtils.getProfileSurfaceColors(appearance, bannerColor),
[appearance, bannerColor],
);
const coverDividerColor = profileSurfaceColors.coverColor;
		useEffect(() => {
			if (isLoading) return;
			const header = profileHeaderRef.current;
			if (!header) return;
			setProfileHeaderWidth(header.getBoundingClientRect().width);
			const observer = new ResizeObserver(([entry]) => {
				if (entry) setProfileHeaderWidth(entry.contentRect.width);
			});
			observer.observe(header);
			return () => observer.disconnect();
		}, [isLoading]);
		useEffect(() => {
			if (autoFocusNote && !hidePrivateDetails) {
				setNoteSheetOpen(true);
			}
		}, [autoFocusNote, hidePrivateDetails]);
		const notchColor = useMemo(
			() => getContrastingNotchColor(effectiveProfile?.banner_color ?? null, !!staticBannerUrl),
			[effectiveProfile?.banner_color, staticBannerUrl],
		);
		const handleMessage = async () => {
			onClose();
			await openDMChannelOrShowError(user.id);
		};
		const handleOpenBlockedDm = () => {
			ModalCommands.push(
				blockedDmConfirmModal(
					i18n,
					displayName,
					handleMessage,
					'user.user-profile-mobile-sheet.handle-open-blocked-dm.confirm-modal',
				),
			);
		};
		const handleSendFriendRequest = () => {
			void RelationshipActionUtils.sendFriendRequest(i18n, user.id);
		};
		const handleAcceptFriendRequest = () => {
			RelationshipActionUtils.showAcceptFriendRequestConfirmation(i18n, user);
		};
		const handleCancelFriendRequest = () => {
			RelationshipCommands.removeRelationship(user.id);
		};
		const handleRemoveFriend = () => {
			RelationshipActionUtils.showRemoveFriendConfirmation(i18n, user);
		};
		const handleUnblockUser = () => {
			RelationshipActionUtils.showUnblockUserConfirmation(i18n, user);
		};
		const handleEditProfile = () => {
			ModalCommands.push(
				modal(() => (
					<UserSettingsModal
						initialTab="my_profile"
						data-flx="user.user-profile-mobile-sheet.handle-edit-profile.user-settings-modal"
					/>
				)),
			);
		};
		const handleStartVoiceCall = async () => {
			await CallUtils.startCallWithUser(i18n, user.id, {kind: 'voice'});
		};
		const handleStartVideoCall = async () => {
			await CallUtils.startCallWithUser(i18n, user.id, {kind: 'video'});
		};
		const handleEmojiPress = (emoji: EmojiPressData) => {
			setSelectedEmoji({
				id: emoji.id ?? undefined,
				name: emoji.name,
				animated: emoji.animated,
			});
			setEmojiInfoOpen(true);
		};
		const handleAvatarContextMenu = (event: React.MouseEvent) => {
			if (!avatarMenuUrl) return;
			ContextMenuCommands.openFromEvent(event, ({onClose}) => (
				<UserImageMenuItems
					user={user}
					profile={profileForHeader}
					profileContext={profileContext}
					onClose={onClose}
					variant="avatar"
					data-flx="user.user-profile-mobile-sheet.avatar-image-menu"
				/>
			));
		};
		const handleBannerContextMenu = (event: React.MouseEvent) => {
			if (!bannerMenuUrl) return;
			ContextMenuCommands.openFromEvent(event, ({onClose}) => (
				<UserImageMenuItems
					user={user}
					profile={profileForHeader}
					profileContext={profileContext}
					onClose={onClose}
					variant="banner"
					data-flx="user.user-profile-mobile-sheet.banner-image-menu"
				/>
			));
		};
		const handleAvatarKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (!avatarMenuUrl || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))) return;
			event.preventDefault();
			ContextMenuCommands.openForElement(event.currentTarget, ({onClose}) => (
				<UserImageMenuItems
					user={user}
					profile={profileForHeader}
					profileContext={profileContext}
					onClose={onClose}
					variant="avatar"
					data-flx="user.user-profile-mobile-sheet.avatar-image-menu-keyboard"
				/>
			));
		};
		const handleBannerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
			if (!bannerMenuUrl || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))) return;
			event.preventDefault();
			ContextMenuCommands.openForElement(event.currentTarget, ({onClose}) => (
				<UserImageMenuItems
					user={user}
					profile={profileForHeader}
					profileContext={profileContext}
					onClose={onClose}
					variant="banner"
					data-flx="user.user-profile-mobile-sheet.banner-image-menu-keyboard"
				/>
			));
		};
		const renderRelationshipButton = () => {
			const isFriendlyBot = user.bot && (user.flags & PublicUserFlags.FRIENDLY_BOT) === PublicUserFlags.FRIENDLY_BOT;
			if (isCurrentUser || (user.bot && !isFriendlyBot)) return null;
			if (RuntimeConfig.directMessagesDisabled && relationshipType !== RelationshipTypes.BLOCKED) {
				return null;
			}
			if (relationshipType === RelationshipTypes.FRIEND) {
				return (
					<button
						type="button"
						onClick={handleRemoveFriend}
						className={styles.actionButton}
						aria-label={i18n._(REMOVE_FRIEND_DESCRIPTOR)}
						data-flx="user.user-profile-mobile-sheet.render-relationship-button.action-button.remove-friend"
					>
						<UserMinusIcon
							className={styles.icon}
							data-flx="user.user-profile-mobile-sheet.render-relationship-button.icon"
						/>
					</button>
				);
			}
			if (relationshipType === RelationshipTypes.BLOCKED) {
				return (
					<button
						type="button"
						onClick={handleUnblockUser}
						className={styles.actionButton}
						aria-label={i18n._(UNBLOCK_USER_DESCRIPTOR)}
						data-flx="user.user-profile-mobile-sheet.render-relationship-button.action-button.unblock-user"
					>
						<ProhibitIcon
							className={styles.icon}
							data-flx="user.user-profile-mobile-sheet.render-relationship-button.icon--2"
						/>
					</button>
				);
			}
			if (relationshipType === RelationshipTypes.INCOMING_REQUEST) {
				return (
					<button
						type="button"
						onClick={handleAcceptFriendRequest}
						className={styles.actionButton}
						aria-label={i18n._(ACCEPT_FRIEND_REQUEST_DESCRIPTOR)}
						data-flx="user.user-profile-mobile-sheet.render-relationship-button.action-button.accept-friend-request"
					>
						<CheckCircleIcon
							className={styles.icon}
							data-flx="user.user-profile-mobile-sheet.render-relationship-button.icon--3"
						/>
					</button>
				);
			}
			if (relationshipType === RelationshipTypes.OUTGOING_REQUEST) {
				return (
					<button
						type="button"
						onClick={handleCancelFriendRequest}
						className={styles.actionButton}
						aria-label={i18n._(CANCEL_FRIEND_REQUEST_DESCRIPTOR)}
						data-flx="user.user-profile-mobile-sheet.render-relationship-button.action-button.cancel-friend-request"
					>
						<ClockCounterClockwiseIcon
							className={styles.icon}
							data-flx="user.user-profile-mobile-sheet.render-relationship-button.icon--4"
						/>
					</button>
				);
			}
			if (relationshipType === undefined && !currentUserUnclaimed && Users.currentUser?.verified !== false) {
				return (
					<button
						type="button"
						onClick={handleSendFriendRequest}
						className={styles.actionButton}
						aria-label={i18n._(SEND_FRIEND_REQUEST_DESCRIPTOR)}
						data-flx="user.user-profile-mobile-sheet.render-relationship-button.action-button.send-friend-request"
					>
						<UserPlusIcon
							className={styles.icon}
							data-flx="user.user-profile-mobile-sheet.render-relationship-button.icon--5"
						/>
					</button>
				);
			}
			return null;
		};
		const renderMobileIdentity = () => (
			<div className={styles.mobileIdentityContent}>
				<div
					className={styles.usernameContainer}
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.username-container"
				>
					<div
						className={styles.usernameRow}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.username-row"
					>
						<span
							className={styles.username}
							data-name-effect={
								appearance?.nameStyleEnabled
									? appearance.nameColorEnabled === false
										? 'solid'
										: appearance.nameEffect
									: undefined
							}
							data-name-font={appearance?.nameStyleEnabled ? appearance.nameFont : undefined}
							data-name-motion={
								appearance?.nameStyleEnabled &&
								appearance.nameColorEnabled === false &&
								['shimmer', 'pulse', 'spectrum'].includes(appearance.nameAnimation)
									? 'off'
									: appearance?.nameStyleEnabled
										? appearance.nameAnimation
										: undefined
							}
							style={
								appearance?.nameStyleEnabled
									? ({
											'--profile-name-start':
												appearance.nameColorEnabled === false
													? 'var(--text-primary)'
													: (nameEffectSettings?.colors[0] ?? appearance.nameColorStart),
											'--profile-name-end':
												appearance.nameColorEnabled === false
													? 'var(--text-primary)'
													: (nameEffectSettings?.colors.at(-1) ?? appearance.nameColorEnd),
											'--profile-name-gradient': `linear-gradient(${nameEffectSettings?.direction === 'left' ? '270deg' : nameEffectSettings?.direction === 'up' ? '0deg' : nameEffectSettings?.direction === 'down' ? '180deg' : '90deg'}, ${appearance.nameColorEnabled === false ? 'var(--text-primary)' : (nameEffectSettings?.colors.join(', ') ?? appearance.nameColorStart)})`,
											'--profile-name-duration':
												nameEffectSettings?.speed === 'slow'
													? '4.8s'
													: nameEffectSettings?.speed === 'fast'
														? '1.35s'
														: '2.8s',
											'--profile-name-intensity': `${nameEffectSettings?.intensity ?? 70}%`,
										} as React.CSSProperties)
									: undefined
							}
							data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.username"
						>
							{displayName}
						</span>
						{isCurrentUser && (
							<button
								type="button"
								className={styles.accountActionsButton}
								onClick={() => setAccountActionsOpen(true)}
								aria-label={i18n._(SWITCH_ACCOUNTS_DESCRIPTOR)}
								aria-haspopup="dialog"
								data-flx="user.user-profile-mobile-sheet.account-actions-button"
							>
								<CaretDownIcon weight="bold" aria-hidden="true" />
							</button>
						)}
					</div>
					<div className={styles.tagBadgeRow}>
						<span className={styles.usernameHandle} data-flx="user.user-profile-mobile-sheet.username-handle">
							@{NicknameUtils.formatTagForStreamerMode(user.username)}
							{shouldShowDiscriminator(user) &&
								`#${NicknameUtils.formatTagForStreamerMode(user.discriminator)}`}
						</span>
					</div>
					<div
						className={styles.customStatusRow}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.custom-status-row"
					>
						<CustomStatusDisplay
							userId={user.id}
							className={styles.customStatusText}
							showTooltip
							allowJumboEmoji
							maxLines={2}
							alwaysAnimate={shouldAutoplayProfileAnimations}
							onEmojiPress={isCurrentUser ? undefined : handleEmojiPress}
							data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.custom-status-text"
						/>
					</div>
				</div>
			</div>
		);
		const renderMobileHeaderActions = () => (
			<div
				className={styles.headerActionsContainer}
				data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.header-actions-container"
			>
				{!isCurrentUser && renderRelationshipButton()}
				<button
					type="button"
					onClick={() => setActionsSheetOpen(true)}
					className={styles.actionButton}
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-button.set-actions-sheet-open"
				>
					<DotsThreeIcon
						className={styles.icon}
						weight="bold"
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.icon"
					/>
				</button>
			</div>
		);
		const renderEditProfileButton = () =>
			isCurrentUser &&
			!currentUserUnclaimed && (
				<button
					type="button"
					onClick={handleEditProfile}
					className={styles.editProfileButton}
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.edit-profile-button"
				>
					<PencilIcon
						className={styles.editProfileIcon}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.edit-profile-icon"
					/>
					<span
						className={styles.editProfileText}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.edit-profile-text"
					>
						<Trans>Edit profile</Trans>
					</span>
				</button>
			);
		const renderCurrentUserAccountActions = () =>
			isCurrentUser && (
				<div
					className={styles.ownerAccountActions}
					data-flx="user.user-profile-mobile-sheet.owner-account-actions"
				>
					<button
						type="button"
						className={styles.ownerAccountActionButton}
						onClick={() => setStatusSheetOpen(true)}
						aria-label={i18n._(SET_STATUS_DESCRIPTOR)}
						aria-haspopup="dialog"
						data-flx="user.user-profile-mobile-sheet.owner-account-actions.set-status"
					>
						<span className={styles.ownerAccountActionTitle}>
							<StatusIndicator status={status} size={14} />
							<Trans>Set status</Trans>
						</span>
						<span className={styles.ownerAccountActionValue}>
							<span>{getStatusTypeLabel(i18n, status)}</span>
							<CaretDownIcon className={styles.ownerAccountActionIcon} weight="bold" aria-hidden="true" />
						</span>
					</button>
					<div className={styles.ownerAccountActionDivider} />
					<button
						type="button"
						className={styles.ownerAccountActionButton}
						onClick={openAccountSwitcher}
						aria-label={i18n._(ADD_ACCOUNT_DESCRIPTOR)}
						data-flx="user.user-profile-mobile-sheet.owner-account-actions.add-account"
					>
						<span>
							<Trans>Add account</Trans>
						</span>
						<PlusIcon className={styles.ownerAccountActionIcon} aria-hidden="true" />
					</button>
				</div>
			);
		const renderMobileFooterActions = () =>
			isCurrentUser ? null : (
				<footer
					className={styles.actionFooter}
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-buttons-container--2"
				>
					{!RuntimeConfig.directMessagesDisabled && (
						<button
							type="button"
							onClick={isBlocked ? handleOpenBlockedDm : handleMessage}
							className={styles.actionCard}
							data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-card.open-blocked-dm.button"
						>
							<div
								className={styles.actionIconContainer}
								data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-icon-container"
							>
								<ChatTeardropIcon
									className={styles.actionIcon}
									data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-icon"
								/>
							</div>
							<span
								className={styles.actionLabel}
								data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-label"
							>
								{isBlocked ? i18n._(OPEN_DM_DESCRIPTOR) : <Trans context="message-action">Message</Trans>}
							</span>
						</button>
					)}
					{relationshipType === RelationshipTypes.FRIEND &&
						!user.bot &&
						!hasActiveDirectCall &&
						!RuntimeConfig.directMessagesDisabled && (
							<>
								<button
									type="button"
									onClick={handleStartVoiceCall}
									className={styles.actionCard}
									data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-card.start-voice-call.button"
								>
									<div
										className={styles.actionIconContainerSecondary}
										data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-icon-container-secondary"
									>
										<PhoneIcon
											className={styles.actionIconSecondary}
											data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-icon-secondary"
										/>
									</div>
									<span
										className={styles.actionLabel}
										data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-label--2"
									>
										<Trans>Voice call</Trans>
									</span>
								</button>
								<button
									type="button"
									onClick={handleStartVideoCall}
									className={styles.actionCard}
									data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-card.start-video-call.button"
								>
									<div
										className={styles.actionIconContainerSecondary}
										data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-icon-container-secondary--2"
									>
										<VideoCameraIcon
											className={styles.actionIconSecondary}
											data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-icon-secondary--2"
										/>
									</div>
									<span
										className={styles.actionLabel}
										data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.action-label--3"
									>
										<Trans>Video call</Trans>
									</span>
								</button>
							</>
						)}
				</footer>
			);
		return (
			<>
				<BottomSheet
					isOpen={true}
					onClose={onClose}
					snapPoints={[0, 0.9, 1]}
					initialSnap={1}
					disablePadding={true}
					disableDefaultHeader={true}
					showHandle={false}
					containerClassName={styles.sheetContainer}
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.bottom-sheet"
				>
					<div
						className={`${styles.container} ${cardEffects.profileCardEffects}`}
ref={profileCardRef}
data-frame={profileFrameId}
						data-card-effect={appearance?.cardEffect ?? 'none'}
data-open-effect={profileEffectId ?? 'none'}
						style={{
							'--profile-sheet-accent': bannerColor,
'--profile-border-color': profileSurfaceColors.borderColor,
							'--profile-background-primary': appearance?.profileBackgroundPrimary,
							'--profile-background-secondary': appearance?.profileBackgroundSecondary,
						} as React.CSSProperties}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.container"
					>
						{isLoading ? (
							<div
								className={styles.loadingScreen}
								data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.loading-screen"
							>
								<Spinner
									size="large"
									data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.spinner"
								/>
							</div>
						) : (
							<Scroller
								key="user-profile-mobile-sheet-scroller"
								data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.scroller"
							>
								<div
									style={{
										paddingBottom: isCurrentUser
											? 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)'
											: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
									}}
									data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.div"
								>
									<div
										className={styles.profileHeaderArea}
										ref={profileHeaderRef}
										style={{'--mobile-avatar-size': `${mobileAvatarSize}px`} as React.CSSProperties}
										data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.profile-header-area"
									>
										<ProfileCardBanner
											variant="expanded"
											bannerUrl={staticBannerUrl}
											hoverBannerUrl={hoverBannerUrl}
											bannerColor={coverDividerColor}
											user={user}
											avatarUrl={avatarUrl}
											hoverAvatarUrl={hoverAvatarUrl}
											appearance={appearance}
											avatarSize={mobileAvatarSize}
											isClickable={false}
											onAvatarClick={
isCurrentUser ? () => setStatusSheetOpen(true) : undefined
											}
											onAvatarContextMenu={handleAvatarContextMenu}
											onAvatarKeyDown={handleAvatarKeyDown}
											onBannerContextMenu={handleBannerContextMenu}
											onBannerKeyDown={handleBannerKeyDown}
											data-flx="user.user-profile-mobile-sheet.profile-card-banner"
										/>
										<div className={styles.mobileIdentity}>{renderMobileIdentity()}</div>
										<div className={styles.mobileHeaderActions}>{renderMobileHeaderActions()}</div>
										<Sheet.Handle
											className={styles.notchContainer}
											data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.notch-container"
										>
											<div
												className={styles.notch}
												style={{backgroundColor: notchColor}}
												data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.notch"
											/>
										</Sheet.Handle>
									</div>
									<div className={styles.belowCoverBadges}>
										<UserProfileBadges
											user={user}
											profile={profileForHeader}
											isModal={true}
											isMobile={false}
											data-flx="user.user-profile-mobile-sheet.user-profile-badges"
										/>
									</div>
									{renderEditProfileButton()}
									{renderCurrentUserAccountActions()}
									<div
										className={styles.profileContent}
										data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.profile-content"
									>
										<div
											className={styles.contentPadding}
											data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.content-padding"
										>
				<GamingActivityCard guildId={guildId} userId={user.id} />
											{profile && (effectiveProfile?.bio || profile) && (
												<div
													className={styles.infoCard}
													data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.info-card"
												>
													{effectiveProfile?.bio && (
														<div
															className={styles.bioSection}
															data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.bio-section"
														>
															<h3
																className={styles.bioHeader}
																data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.bio-header"
															>
																<Trans>About me</Trans>
															</h3>
															<UserProfileBio
																profile={profile}
																profileData={effectiveProfile}
																data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.user-profile-bio"
															/>
														</div>
													)}
													<UserProfileTimezoneInfo
														profile={profile}
														data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.user-profile-timezone-info"
													/>
													<UserProfileMembershipInfo
														profile={profile}
														user={user}
														data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.user-profile-membership-info"
													/>
													<div
														className={styles.rolesSection}
														data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.roles-section"
													>
														<UserProfileRoles
															profile={profile}
															user={user}
															memberRoles={[...memberRoles]}
															canManageRoles={canManageRoles}
															data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.user-profile-roles"
														/>
													</div>
													<UserProfileConnections
														profile={profile}
														variant="mobile"
														data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.user-profile-connections"
													/>
												</div>
											)}
											{!isCurrentUser && hasMutuals && (
												<div
													className={styles.mutualButtonsGroup}
													data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-buttons-group"
												>
													{[
														mutualFriendsCount > 0 && (
															<button
																key="friends"
																type="button"
																className={styles.mutualButton}
																onClick={() => setMutualSheetView('friends')}
																data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-button.set-mutual-sheet-view"
															>
																<span
																	className={styles.mutualButtonLabel}
																	data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-button-label"
																>
																	<Trans>Mutual friends ({mutualFriendsCount})</Trans>
																</span>
															</button>
														),
														mutualCommunitiesGroupsCount > 0 && (
															<button
																key="communities-groups"
																type="button"
																className={styles.mutualButton}
																onClick={() => setMutualSheetView('communities_groups')}
																data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-button.set-mutual-sheet-view--2"
															>
																<span
																	className={styles.mutualButtonLabel}
																	data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-button-label--2"
																>
																	{i18n._(
																		getMutualItemsDescriptor({
																			mutualCommunitiesCount,
																			mutualGroupsCount,
																			includeCount: true,
																		}),
																		{count: mutualCommunitiesGroupsCount},
																	)}
																</span>
															</button>
														),
													]
														.filter(Boolean)
														.flatMap((item, i, arr) =>
															i < arr.length - 1
																? [
																		item,
																		<div
																			key={`divider-${i}`}
																			className={styles.mutualDivider}
																			data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-divider"
																		/>,
																	]
																: [item],
														)}
												</div>
											)}
											{!hidePrivateDetails && (
												<button
													type="button"
													onClick={() => setNoteSheetOpen(true)}
													className={styles.noteButton}
													data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-button.set-note-sheet-open"
												>
													<div data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.div--2">
														<h3
															className={styles.noteTitle}
															data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-title"
														>
															<Trans>Note</Trans>
														</h3>
														<p
															className={styles.noteSubtitle}
															data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-subtitle"
														>
															<Trans>(only visible to you)</Trans>
														</p>
														{userNote && (
															<p
																className={styles.noteText}
																data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-text"
															>
																{userNote}
															</p>
														)}
													</div>
													<div
														className={styles.noteIconContainer}
														data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-icon-container"
													>
														<NotePencilIcon
															className={styles.noteIcon}
															data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-icon"
														/>
													</div>
												</button>
											)}
											{renderMobileFooterActions()}
										</div>
									</div>
								</div>
							</Scroller>
						)}
						{isCurrentUser && !isLoading && (
					<div className={styles.profileActionDock} data-flx="user.user-profile-mobile-sheet.profile-action-dock">
								<button
									type="button"
									className={styles.profileActionButton}
									onClick={openUserSettingsModal}
									aria-label={i18n._(SETTINGS_DESCRIPTOR)}
									data-flx="user.user-profile-mobile-sheet.profile-action-dock.settings"
								>
									<GearIcon weight="fill" className={styles.profileActionIcon} />
								</button>
							</div>
						)}
{profileMediaLayers.profileEffectIds.map((effectId, index) => (
<ProfileEffectMedia key={`${effectId}-${index}`} effectId={effectId} zIndex={8 + index} />
))}
					</div>
{profileMediaLayers.cardFrameIds.map((frame, index) => (
<ProfileFrameMedia key={`${frame}-${index}`} frame={frame} cardRef={profileCardRef} />
))}
				</BottomSheet>
				{!hidePrivateDetails && (
					<NoteEditSheet
						isOpen={noteSheetOpen}
						onClose={() => setNoteSheetOpen(false)}
						userId={user.id}
						initialNote={userNote}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.note-edit-sheet"
					/>
				)}
				<UserProfileActionsSheet
					isOpen={actionsSheetOpen}
					onClose={() => setActionsSheetOpen(false)}
					user={user}
					isCurrentUser={isCurrentUser}
					hasGuildProfile={hasGuildProfile}
					showGlobalProfile={showGlobalProfile}
					onToggleProfileView={() => setShowGlobalProfile(!showGlobalProfile)}
					guildId={guildId}
					guildMember={guildMember}
					showReportUserProfile
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.user-profile-actions-sheet"
				/>
				<StatusChangeBottomSheet isOpen={statusSheetOpen} onClose={() => setStatusSheetOpen(false)} />
				<MenuBottomSheet
					isOpen={accountActionsOpen}
					onClose={() => setAccountActionsOpen(false)}
					groups={accountActionGroups}
					data-flx="user.user-profile-mobile-sheet.account-actions-sheet"
				/>
				<ExpressionInfoBottomSheet
					kind="emoji"
					isOpen={emojiInfoOpen}
					onClose={() => setEmojiInfoOpen(false)}
					emoji={selectedEmoji}
					data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.expression-info-bottom-sheet"
				/>
				{mutualSheetView != null && (
					<MutualItemsSheet
						onClose={() => setMutualSheetView(null)}
						view={mutualSheetView}
						profile={profile}
						mutualGroups={mutualGroups}
						data-flx="user.user-profile-mobile-sheet.user-profile-mobile-sheet-content.mutual-items-sheet"
					/>
				)}
			</>
		);
	},
);
