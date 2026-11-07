// SPDX-License-Identifier: Nebula

import {UserTag} from '@app/features/channel/components/ChannelUserTag';
import FocusRing from '@app/features/ui/focus_ring/FocusRing';
import {useTextOverflow} from '@app/features/ui/hooks/useTextOverflow';
import {Tooltip} from '@app/features/ui/tooltip/Tooltip';
import styles from '@app/features/user/components/profile/profile_card/ProfileCardUserInfo.module.css';
import type {ProfileAppearance} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import type {User} from '@app/features/user/models/User';
import * as NicknameUtils from '@app/features/user/utils/NicknameUtils';
import {Trans} from '@lingui/react/macro';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useRef} from 'react';
import {ProfileDisplayName} from '@app/features/user/components/profile/media/ProfileDisplayName';
import {getNameEffectSettings} from '@app/features/user/components/profile/studio/nameStyleColors';

type DisplayNameStyle = React.CSSProperties & {
	'--profile-display-name-length': number;
	'--profile-name-start'?: string;
	'--profile-name-end'?: string;
	'--profile-name-gradient'?: string;
	'--profile-name-duration'?: string;
	'--profile-name-intensity'?: string;
};

interface ProfileCardUserInfoProps {
	displayName: string;
	displayNameClassName?: string;
	user: User;
	pronouns?: string | null;
	showUsername?: boolean;
	isClickable?: boolean;
	isWebhook?: boolean;
	onDisplayNameClick?: () => void;
	onUsernameClick?: () => void;
	inlineDisplayNameEditor?: React.ReactNode;
	actions?: React.ReactNode;
	usernameActions?: React.ReactNode;
	appearance?: ProfileAppearance | null;
}

export const ProfileCardUserInfo: React.FC<ProfileCardUserInfoProps> = observer(
	({
		displayName,
		displayNameClassName,
		user,
		pronouns,
		showUsername = true,
		isClickable = true,
		isWebhook = false,
		onDisplayNameClick,
		onUsernameClick,
		inlineDisplayNameEditor,
		actions,
		usernameActions,
		appearance,
	}) => {
		const displayNameRef = useRef<HTMLButtonElement>(null);
		const isDisplayNameOverflowing = useTextOverflow(displayNameRef, {
			content: displayName,
			measureTextRange: true,
		});
		const effectSettings = appearance ? getNameEffectSettings(appearance) : null;
		const colorsEnabled = appearance?.nameColorEnabled !== false;
		const storedMotion = appearance?.nameAnimation ?? 'off';
		const colorMotion = storedMotion === 'shimmer' || storedMotion === 'pulse' || storedMotion === 'spectrum';
		const effectiveNameEffect = appearance?.nameStyleEnabled ? (colorsEnabled ? appearance.nameEffect : 'solid') : undefined;
		const effectiveMotion = appearance?.nameStyleEnabled
			? colorsEnabled || !colorMotion ? storedMotion : 'off'
			: undefined;
		const displayNameStyle: DisplayNameStyle = {
			'--profile-display-name-length': Math.max(Array.from(displayName).length, 1),
			...(appearance?.nameStyleEnabled ? {
				'--profile-name-start': colorsEnabled ? effectSettings?.colors[0] ?? appearance.nameColorStart : 'var(--text-primary)',
				'--profile-name-end': colorsEnabled ? effectSettings?.colors.at(-1) ?? appearance.nameColorEnd : 'var(--text-primary)',
				'--profile-name-gradient': `linear-gradient(${effectSettings?.direction === 'left' ? '270deg' : effectSettings?.direction === 'up' ? '0deg' : effectSettings?.direction === 'down' ? '180deg' : '90deg'}, ${colorsEnabled ? effectSettings?.colors.join(', ') : 'var(--text-primary)'})`,
				'--profile-name-duration': appearance.nameEffects?.[appearance.nameEffect]?.speed === 'slow' ? '4.8s' : appearance.nameEffects?.[appearance.nameEffect]?.speed === 'fast' ? '1.35s' : '2.8s',
				'--profile-name-intensity': `${appearance.nameEffects?.[appearance.nameEffect]?.intensity ?? 70}%`,
			} : {}),
		};
		const displayNameButton = (
			<button
				ref={displayNameRef}
				type="button"
				onClick={onDisplayNameClick}
				className={clsx(styles.nameButton, displayNameClassName, isClickable && styles.nameButtonClickable)}
				style={displayNameStyle}
				data-name-font={appearance?.nameStyleEnabled ? appearance.nameFont : undefined}
				data-flx="user.profile.profile-card.profile-card-user-info.name-button.display-name-click"
			>
<ProfileDisplayName name={displayName} appearance={appearance} />
			</button>
		);
		const displayNameContent = isDisplayNameOverflowing ? (
			<Tooltip text={displayName} data-flx="user.profile.profile-card.profile-card-user-info.display-name-tooltip">
				{displayNameButton}
			</Tooltip>
		) : (
			displayNameButton
		);
		return (
			<div
				className={styles.userInfoContainer}
				data-flx="user.profile.profile-card.profile-card-user-info.user-info-container"
			>
				<div className={styles.nameRow} data-flx="user.profile.profile-card.profile-card-user-info.name-row">
					{inlineDisplayNameEditor ?? (
						<FocusRing
							offset={-2}
							focusTarget={displayNameRef}
							ringTarget={displayNameRef}
							data-flx="user.profile.profile-card.profile-card-user-info.focus-ring"
						>
							{displayNameContent}
						</FocusRing>
					)}
					<div
						className={styles.badgeContainer}
						data-flx="user.profile.profile-card.profile-card-user-info.badge-container"
					>
						{(user.bot || isWebhook) && (
							<UserTag
								className={styles.userTagWrapper}
								system={user.system}
								data-flx="user.profile.profile-card.profile-card-user-info.user-tag-wrapper"
							/>
						)}
					</div>
					{actions && (
						<div
							className={styles.actionsContainer}
							data-flx="user.profile.profile-card.profile-card-user-info.actions-container"
						>
							{actions}
						</div>
					)}
				</div>
				{showUsername && (
					<div className={styles.usernameRow} data-flx="user.profile.profile-card.profile-card-user-info.username-row">
						<FocusRing offset={-2} data-flx="user.profile.profile-card.profile-card-user-info.focus-ring--2">
							<button
								type="button"
								onClick={onUsernameClick}
								className={styles.usernameButton}
								data-flx="user.profile.profile-card.profile-card-user-info.username-button.username-click"
							>
								{NicknameUtils.formatTagForStreamerMode(user.tag)}
							</button>
						</FocusRing>
						{usernameActions}
					</div>
				)}
				{pronouns && (
					<div className={styles.pronouns} data-flx="user.profile.profile-card.profile-card-user-info.pronouns">
						<span className={styles.srOnly} data-flx="user.profile.profile-card.profile-card-user-info.sr-only">
							<Trans>Pronouns: </Trans>
						</span>
						{pronouns}
					</div>
				)}
			</div>
		);
	},
);
