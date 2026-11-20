// SPDX-License-Identifier: Nebula

import {useAnimatedImageUrl} from '@app/features/app/hooks/useAnimatedImageUrl';
import {GifIndicator} from '@app/features/channel/components/embeds/media/GifIndicator';
import {remFromPx} from '@app/features/theme/layout/RemFromPx';
import {StatusAwareAvatar} from '@app/features/ui/components/StatusAwareAvatar';
import FocusRing from '@app/features/ui/focus_ring/FocusRing';
import styles from '@app/features/user/components/profile/profile_card/ProfileCardBanner.module.css';
import {AvatarDecorationMedia} from '@app/features/user/components/profile/media/ProfileMedia';
import {PencilIcon} from '@phosphor-icons/react';
import {
	PROFILE_POPOUT_BANNER_AVATAR_CUTOUT,
	PROFILE_POPOUT_GEOMETRY,
} from '@app/features/user/constants/UserProfileSurfaceGeometry';
import type {User} from '@app/features/user/models/User';
import type {ProfileAppearance} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useId, useMemo} from 'react';

interface ProfileCardBannerProps {
	bannerUrl: string | null;
	hoverBannerUrl?: string | null;
	bannerColor: string;
	user: User;
	avatarUrl: string | null;
	hoverAvatarUrl: string | null;
	variant?: 'compact' | 'expanded';
	disablePresence?: boolean;
	isClickable?: boolean;
	showEditControls?: boolean;
	onAvatarClick?: () => void;
	onBannerClick?: () => void;
	onAvatarContextMenu?: (event: React.MouseEvent) => void;
	onAvatarKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
	onBannerContextMenu?: (event: React.MouseEvent) => void;
	onBannerKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
	appearance?: ProfileAppearance | null;
	avatarSize?: number;
}

export const ProfileCardBanner: React.FC<ProfileCardBannerProps> = observer(
	({
		bannerUrl,
		hoverBannerUrl,
		bannerColor,
		user,
		avatarUrl,
		hoverAvatarUrl,
		variant = 'compact',
		disablePresence = false,
		isClickable = true,
		showEditControls = false,
		onAvatarClick,
		onBannerClick,
		onAvatarContextMenu,
		onAvatarKeyDown,
		onBannerContextMenu,
		onBannerKeyDown,
		appearance,
		avatarSize,
	}) => {
		const isExpanded = variant === 'expanded';
		const expandedCoverHeightPx = PROFILE_POPOUT_GEOMETRY.contentWidthPx * (175 / 420);
		const bannerHeight = isExpanded ? expandedCoverHeightPx : PROFILE_POPOUT_GEOMETRY.bannerHeightPx;
		const viewBoxWidth = PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.viewBoxWidthPx;
		const viewBoxHeight = isExpanded ? expandedCoverHeightPx : PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.viewBoxHeightPx;
		const reactId = useId();
		const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
		const maskId = `uid_${safeId}`;
		const coverClipId = `cover_${safeId}`;
		const headerStyle = useMemo<React.CSSProperties>(
			() =>
				isExpanded
					? {aspectRatio: '420 / 175', height: 'auto'}
					: {height: remFromPx(PROFILE_POPOUT_GEOMETRY.headerHeightPx)},
			[isExpanded],
		);
		const bannerWrapperStyle = useMemo<React.CSSProperties>(
			() =>
				isExpanded
					? {height: '100%', minHeight: '100%'}
					: {minHeight: remFromPx(bannerHeight)},
			[bannerHeight, isExpanded],
		);
		const {
			hoverRef: bannerHoverRef,
			imageUrl: activeBannerUrl,
			showGifIndicator,
		} = useAnimatedImageUrl({
			staticUrl: bannerUrl,
			animatedUrl: hoverBannerUrl,
			kind: 'gif',
		});
		const bannerStyle = useMemo<React.CSSProperties>(
			() => ({
				height: '100%',
				backgroundColor: bannerColor,
				backgroundPosition: `${appearance?.coverPosition?.x ?? 50}% ${appearance?.coverPosition?.y ?? 50}%`,
				backgroundImage: isExpanded
					? activeBannerUrl
						? `linear-gradient(180deg, transparent 45%, rgb(5 5 7 / 70%) 100%), url(${activeBannerUrl})`
						: 'linear-gradient(180deg, transparent 45%, rgb(5 5 7 / 70%) 100%)'
					: activeBannerUrl
						? `url(${activeBannerUrl})`
						: undefined,
			}),
			[activeBannerUrl, bannerColor, appearance?.coverPosition?.x, appearance?.coverPosition?.y, isExpanded],
		);
		return (
			<header
				className={styles.headerSection}
				style={headerStyle}
				data-variant={variant}
				data-flx="user.profile.profile-card.profile-card-banner.header-section"
			>
				<div
					ref={bannerHoverRef}
					role="group"
					tabIndex={onBannerKeyDown ? 0 : undefined}
					className={styles.bannerWrapper}
					style={bannerWrapperStyle}
					onContextMenu={onBannerContextMenu}
					onKeyDown={onBannerKeyDown}
					data-flx="user.profile.profile-card.profile-card-banner.banner-wrapper.banner-context-menu"
				>
					<svg
						className={styles.bannerMask}
						viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
						preserveAspectRatio="none"
						data-flx="user.profile.profile-card.profile-card-banner.banner-mask"
					>
						{!isExpanded && (
							<mask id={maskId} data-flx="user.profile.profile-card.profile-card-banner.mask">
								<rect
									fill="white"
									x="0"
									y="0"
									width={PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.viewBoxWidthPx}
									height={PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.viewBoxHeightPx}
									data-flx="user.profile.profile-card.profile-card-banner.rect"
								/>
								<circle
									fill="black"
									cx={PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.cx}
									cy={PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.cy}
									r={PROFILE_POPOUT_BANNER_AVATAR_CUTOUT.r}
									data-flx="user.profile.profile-card.profile-card-banner.circle"
								/>
							</mask>
						)}
						{isExpanded && (
							<clipPath id={coverClipId} clipPathUnits="objectBoundingBox">
								<path d="M 0 0 L 1 0 L 1 0.7636 C 0.61 0.935, 0.19 0.8085, 0 1 Z" />
							</clipPath>
						)}
						<foreignObject
							x="0"
							y="0"
							width={viewBoxWidth}
							height={viewBoxHeight}
							overflow="visible"
							mask={isExpanded ? undefined : `url(#${maskId})`}
							clipPath={isExpanded ? `url(#${coverClipId})` : undefined}
							data-flx="user.profile.profile-card.profile-card-banner.foreign-object"
						>
							<div
								className={styles.banner}
								style={bannerStyle}
								data-flx="user.profile.profile-card.profile-card-banner.banner"
							/>
						</foreignObject>
					</svg>
					{showGifIndicator && <GifIndicator data-flx="user.profile.profile-card.profile-card-banner.gif-indicator" />}
					{onBannerClick && (
						<button
							type="button"
							className={styles.bannerEditButton}
							aria-label="Edit profile cover"
							onClick={onBannerClick}
							title="Change profile cover"
							data-flx="user.profile.profile-card.profile-card-banner.edit-cover"
						>
							{showEditControls && (
								<span className={styles.editActionBadge} aria-hidden="true">
									<PencilIcon size={16} weight="fill" />
								</span>
							)}
						</button>
					)}
				</div>
				{isExpanded && (
					<svg
						className={styles.coverDivider}
						viewBox="0 0 1000 200"
						preserveAspectRatio="none"
						aria-hidden="true"
						data-flx="user.profile.profile-card.profile-card-banner.cover-divider"
					>
						<path
							d="M 0 200 C 190 38, 610 145, 1000 0"
							fill="none"
							stroke={bannerColor}
							strokeWidth="2.5"
							vectorEffect="non-scaling-stroke"
						/>
					</svg>
				)}
				<FocusRing enabled={false} offset={-2} data-flx="user.profile.profile-card.profile-card-banner.focus-ring">
					<button
						type="button"
						onClick={onAvatarClick}
						onContextMenu={onAvatarContextMenu}
						onKeyDown={onAvatarKeyDown}
						aria-label={showEditControls ? 'Edit profile avatar' : undefined}
						title={showEditControls ? 'Change profile picture' : undefined}
						className={styles.avatarButton}
						data-decoration={appearance?.avatarDecoration ?? 'none'}
						data-flx="user.profile.profile-card.profile-card-banner.avatar-button.avatar-click"
					>
						<StatusAwareAvatar
						size={
							avatarSize ??
							(isExpanded
								? PROFILE_POPOUT_GEOMETRY.expandedAvatarSizePx
								: PROFILE_POPOUT_GEOMETRY.avatarSizePx)
						}
							user={user}
							avatarUrl={avatarUrl}
							hoverAvatarUrl={hoverAvatarUrl}
							disablePresence={disablePresence}
							isClickable={isClickable}
							forceAnimate
							forceAnimateIgnoringSettings
							data-flx="user.profile.profile-card.profile-card-banner.status-aware-avatar"
						/>
<AvatarDecorationMedia decoration={appearance?.avatarDecoration ?? 'none'} size={avatarSize ?? (isExpanded ? PROFILE_POPOUT_GEOMETRY.expandedAvatarSizePx : PROFILE_POPOUT_GEOMETRY.avatarSizePx)} />
						{showEditControls && (
							<span className={`${styles.editActionBadge} ${styles.avatarEditBadge}`} aria-hidden="true">
								<PencilIcon size={14} weight="fill" />
							</span>
						)}
					</button>
				</FocusRing>
			</header>
		);
	},
);
