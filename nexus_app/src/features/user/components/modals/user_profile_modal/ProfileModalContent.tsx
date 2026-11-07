// SPDX-License-Identifier: Nebula

import {getUserAccentColor} from '@app/features/theme/utils/AccentColorUtils';
import {ProfileBody} from '@app/features/user/components/modals/user_profile_modal/ProfileBody';
import {ProfileMediaHeader} from '@app/features/user/components/modals/user_profile_modal/ProfileMediaHeader';
import {UserInfo} from '@app/features/user/components/modals/user_profile_modal/UserProfileModalUserInfo';
import type {ProfileModalContentProps} from '@app/features/user/components/modals/user_profile_modal/UserProfileModalShared';
import * as ProfileDisplayUtils from '@app/features/user/utils/ProfileDisplayUtils';
import {resolveProfileGuildMembership, toProfileDisplayContext} from '@app/features/user/utils/ProfileGuildMembership';
import {NEXUSBOT_ID} from '@nexus/constants/src/AppConstants';
import {
	MEDIA_PROXY_AVATAR_SIZE_PROFILE,
	MEDIA_PROXY_PROFILE_BANNER_SIZE_MODAL,
} from '@nexus/constants/src/MediaProxyAssetSizes';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useMemo} from 'react';

export const ProfileModalContent: React.FC<ProfileModalContentProps> = observer(
	({
		profile,
		user,
		userNote,
		autoFocusNote,
		noteRef,
		renderActionButtons,
		previewOverrides,
		showProfileDataWarning,
	}) => {
		const effectiveProfile = profile?.getEffectiveProfile() ?? null;
		const isSystemUser = user.id === NEXUSBOT_ID;
const accentColor = getUserAccentColor(user, effectiveProfile?.accent_color);
const {coverColor: bannerColor} = ProfileDisplayUtils.getProfileSurfaceColors(
effectiveProfile?.profile_appearance?.appearance,
accentColor,
);
		const membership = resolveProfileGuildMembership(profile);
		const profileContext = useMemo<ProfileDisplayUtils.ProfileDisplayContext>(
			() =>
				toProfileDisplayContext({
					user,
					profile,
					membership,
					guildMemberProfile: profile?.guildMemberProfile,
				}),
			[user, profile, membership],
		);
		const {avatarUrl, hoverAvatarUrl} = useMemo(
			() => ProfileDisplayUtils.getProfileAvatarUrls(profileContext, previewOverrides, MEDIA_PROXY_AVATAR_SIZE_PROFILE),
			[profileContext, previewOverrides],
		);
		const {bannerUrl, hoverBannerUrl} = useMemo(
			() =>
				ProfileDisplayUtils.getProfileBannerUrls(
					profileContext,
					previewOverrides,
					MEDIA_PROXY_PROFILE_BANNER_SIZE_MODAL,
				),
			[profileContext, previewOverrides],
		);
		return (
			<>
				<ProfileMediaHeader
					user={user}
					profile={profile}
					profileContext={profileContext}
					previewOverrides={previewOverrides}
					bannerColor={bannerColor}
					bannerUrl={isSystemUser ? null : bannerUrl}
					hoverBannerUrl={isSystemUser ? null : hoverBannerUrl}
					avatarUrl={avatarUrl}
					hoverAvatarUrl={hoverAvatarUrl}
					renderActionButtons={renderActionButtons}
identity={
<UserInfo
user={user}
profile={profile}
guildId={profile.guildId ?? undefined}
showProfileDataWarning={showProfileDataWarning}
/>
}
					data-flx="user.user-profile-modal.profile-modal-content.profile-media-header"
				/>
				<ProfileBody
					profile={profile}
					user={user}
					userNote={userNote}
					autoFocusNote={autoFocusNote}
					noteRef={noteRef}
					data-flx="user.user-profile-modal.profile-modal-content.profile-body"
				/>
			</>
		);
	},
);
