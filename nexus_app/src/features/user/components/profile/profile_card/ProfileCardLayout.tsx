// SPDX-License-Identifier: Nebula

import styles from '@app/features/user/components/profile/profile_card/ProfileCardLayout.module.css';
import {ProfileEffectMedia, ProfileFrameMedia} from '@app/features/user/components/profile/media/ProfileMedia';
import type {ProfileAppearance} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {Trans} from '@lingui/react/macro';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useMemo, useRef} from 'react';

interface ProfileCardLayoutProps {
	borderColor: string;
	showPreviewLabel?: boolean;
	hoverRef?: (instance: HTMLDivElement | null) => void;
	className?: string;
	style?: React.CSSProperties;
	appearance?: ProfileAppearance | null;
	profileEffectId?: string | null;
	profileEffectLayers?: ReadonlyArray<string>;
	profileFrameLayers?: ReadonlyArray<string>;
	children: React.ReactNode;
}

export const ProfileCardLayout: React.FC<ProfileCardLayoutProps> = observer(
	({
		borderColor,
		showPreviewLabel = false,
		hoverRef,
		className,
		style,
		appearance,
		profileEffectId,
		profileEffectLayers,
		profileFrameLayers,
		children,
	}) => {
const mediaCardRef = useRef<HTMLDivElement>(null);
		const cardStyle = useMemo<React.CSSProperties>(
			() => ({
				...style,
				borderColor,
				'--profile-background-primary': appearance?.profileBackgroundPrimary,
				'--profile-background-secondary': appearance?.profileBackgroundSecondary,
			} as React.CSSProperties),
			[appearance?.profileBackgroundPrimary, appearance?.profileBackgroundSecondary, borderColor, style],
		);
		const resolvedEffectLayers =
			profileEffectLayers ?? (profileEffectId ? [profileEffectId] : []);
		const resolvedFrameLayers =
			profileFrameLayers ?? (appearance?.cardFrame && appearance.cardFrame !== 'none' ? [appearance.cardFrame] : []);
		const topEffectId = resolvedEffectLayers.at(-1) ?? profileEffectId;
		const topFrameId = resolvedFrameLayers.at(-1) ?? appearance?.cardFrame ?? 'none';
		return (
<div style={{position: 'relative', overflow: 'visible'}} data-flx="user.profile.profile-card.profile-card-layout.div">
				{showPreviewLabel && (
					<div className={styles.previewLabel} data-flx="user.profile.profile-card.profile-card-layout.preview-label">
						<Trans>Profile preview</Trans>
					</div>
				)}
				<div
ref={(node) => {mediaCardRef.current = node; hoverRef?.(node);}}
					className={clsx(styles.profileCard, className)}
					data-frame={topFrameId}
					data-card-effect={appearance?.cardEffect ?? 'none'}
					data-open-effect={topEffectId || 'none'}
					style={cardStyle}
					data-flx="user.profile.profile-card.profile-card-layout.profile-card"
				>
					{children}
					{resolvedEffectLayers.map((effectId, index) => (
						<ProfileEffectMedia key={`${effectId}-${index}`} effectId={effectId} zIndex={8 + index} />
					))}
					{appearance && (
						<div
							className={styles.profileDivider}
							data-mode={appearance.dividerMode}
							style={appearance.dividerMode === 'custom' && appearance.dividerCustomColor ? {'--profile-divider-color': appearance.dividerCustomColor} as React.CSSProperties : undefined}
							aria-hidden="true"
						/>
					)}
				</div>
				{resolvedFrameLayers.map((frame, index) => (
					<ProfileFrameMedia
						key={`${frame}-${index}`}
						frame={frame}
						cardRef={mediaCardRef}
					/>
				))}
			</div>
		);
	},
);
