// SPDX-License-Identifier: Nebula

import {CustomStatusDisplay} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import {UserTag} from '@app/features/channel/components/ChannelUserTag';
import userProfileModalStyles from '@app/features/user/components/modals/UserProfileModal.module.css';
import type {UserInfoProps} from '@app/features/user/components/modals/user_profile_modal/UserProfileModalShared';
import {LimitedProfileNotice} from '@app/features/user/components/popouts/LimitedProfileNotice';
import {UserProfileBadges} from '@app/features/user/components/popouts/UserProfileBadges';
import {UserProfileDataWarning} from '@app/features/user/components/popouts/UserProfileDataWarning';
import {useAutoplayExpandedProfileAnimations} from '@app/features/user/hooks/useAutoplayExpandedProfileAnimations';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import {
	getProfileMembershipDisplayName,
	resolveProfileGuildMembership,
} from '@app/features/user/utils/ProfileGuildMembership';
import {Trans} from '@lingui/react/macro';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {getNameEffectSettings} from '@app/features/user/components/profile/studio/nameStyleColors';

export const UserInfo: React.FC<UserInfoProps> = observer(({user, profile, guildId, showProfileDataWarning}) => {
	const membership = resolveProfileGuildMembership(profile);
	const displayName = getProfileMembershipDisplayName(user, membership, guildId);
	const effectiveProfile = profile?.getEffectiveProfile() ?? null;
		const appearance = effectiveProfile?.profile_appearance?.appearance ?? null;
		const nameColors = appearance ? getNameEffectSettings(appearance).colors : undefined;
	const shouldAutoplayProfileAnimations = useAutoplayExpandedProfileAnimations();
	return (
		<div className={userProfileModalStyles.userInfo} data-flx="user.user-profile-modal.user-info.div">
			<div
				className={clsx(userProfileModalStyles.userInfoHeader, userProfileModalStyles.userInfoHeaderDesktop)}
				data-flx="user.user-profile-modal.user-info.div--2"
			>
				<div className={userProfileModalStyles.userInfoContent} data-flx="user.user-profile-modal.user-info.div--3">
					{showProfileDataWarning && (
						<div
							className={userProfileModalStyles.profileDataWarning}
							data-flx="user.user-profile-modal.user-info.div--4"
						>
							<UserProfileDataWarning data-flx="user.user-profile-modal.user-info.user-profile-data-warning" />
						</div>
					)}
					{profile?.profileLimited && (
						<div
							className={userProfileModalStyles.profileDataWarning}
							data-flx="user.user-profile-modal.user-info.profile-limited-notice"
						>
							<LimitedProfileNotice data-flx="user.user-profile-modal.user-profile-modal-user-info.user-info.limited-profile-notice" />
						</div>
					)}
					<div className={userProfileModalStyles.nameRow} data-flx="user.user-profile-modal.user-info.div--5">
						<span
							className={userProfileModalStyles.userName}
							data-name-effect={appearance?.nameStyleEnabled ? appearance.nameColorEnabled === false ? 'solid' : appearance.nameEffect : undefined}
							data-name-font={appearance?.nameStyleEnabled ? appearance.nameFont : undefined}
							data-name-motion={appearance?.nameStyleEnabled ? appearance.nameColorEnabled === false && ['shimmer', 'pulse', 'spectrum'].includes(appearance.nameAnimation) ? 'off' : appearance.nameAnimation : undefined}
							style={appearance?.nameStyleEnabled ? {
								'--profile-name-start': appearance.nameColorEnabled === false ? 'var(--text-primary)' : nameColors?.[0] ?? appearance.nameColorStart,
								'--profile-name-end': appearance.nameColorEnabled === false ? 'var(--text-primary)' : nameColors?.at(-1) ?? appearance.nameColorEnd,
								'--profile-name-gradient': `linear-gradient(${appearance.nameEffects?.[appearance.nameEffect]?.direction === 'left' ? '270deg' : appearance.nameEffects?.[appearance.nameEffect]?.direction === 'up' ? '0deg' : appearance.nameEffects?.[appearance.nameEffect]?.direction === 'down' ? '180deg' : '90deg'}, ${appearance.nameColorEnabled === false ? 'var(--text-primary)' : nameColors?.join(', ') ?? appearance.nameColorStart})`,
								'--profile-name-duration': appearance.nameEffects?.[appearance.nameEffect]?.speed === 'slow' ? '4.8s' : appearance.nameEffects?.[appearance.nameEffect]?.speed === 'fast' ? '1.35s' : '2.8s',
								'--profile-name-intensity': `${appearance.nameEffects?.[appearance.nameEffect]?.intensity ?? 70}%`,
							} as React.CSSProperties : undefined}
							data-flx="user.user-profile-modal.user-info.span"
						>
							{displayName}
						</span>
						{user.bot && (
							<UserTag
								className={userProfileModalStyles.userTag}
								system={user.system}
								size="lg"
								data-flx="user.user-profile-modal.user-info.user-tag"
							/>
						)}
					</div>
					<div className={userProfileModalStyles.tagBadgeRow} data-flx="user.user-profile-modal.user-info.div--6">
						<div className={userProfileModalStyles.usernameRow} data-flx="user.user-profile-modal.user-info.div--7">
							{NicknameUtils.formatTagForStreamerMode(user.tag)}
						</div>
						<div className={userProfileModalStyles.badgesWrapper} data-flx="user.user-profile-modal.user-info.div--8">
							<UserProfileBadges
								user={user}
								profile={profile}
								isModal={true}
								isMobile={false}
								data-flx="user.user-profile-modal.user-info.user-profile-badges"
							/>
						</div>
					</div>
					{effectiveProfile?.pronouns && (
						<div className={userProfileModalStyles.pronouns} data-flx="user.user-profile-modal.user-info.div--9">
							<span className={userProfileModalStyles.srOnly} data-flx="user.user-profile-modal.user-info.span--2">
								<Trans>Pronouns: </Trans>
							</span>
							{effectiveProfile.pronouns}
						</div>
					)}
					<div className={userProfileModalStyles.customStatusRow} data-flx="user.user-profile-modal.user-info.div--10">
						<CustomStatusDisplay
							userId={user.id}
							className={userProfileModalStyles.customStatusText}
							showTooltip
							allowJumboEmoji
							maxLines={0}
							alwaysAnimate={shouldAutoplayProfileAnimations}
							data-flx="user.user-profile-modal.user-info.custom-status-display"
						/>
					</div>
				</div>
			</div>
		</div>
	);
});
