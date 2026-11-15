// SPDX-License-Identifier: Nebula

import {NEXUSIconMark} from '@app/features/ui/components/icons/NexusIconMark';
import {
	ArrowLeft,
	ArrowRight,
	ChatCircle,
	Compass,
	GearSix,
	Headphones,
	Plus,
	UserCircle,
	UserPlus,
	UsersThree,
} from '@phosphor-icons/react';
import type {CSSProperties, KeyboardEvent as ReactKeyboardEvent} from 'react';
import {useEffect, useId, useRef} from 'react';
import type {FeatureDiscoveryIllustration} from '@app/features/onboarding/state/FeatureDiscovery';
import styles from './FeatureDiscovery.module.css';

export type FeatureDiscoveryMode = 'center' | 'spotlight' | 'bottom-sheet';

export interface FeatureDiscoveryTargetRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

export interface FeatureDiscoveryLabels {
	next: string;
	back: string;
	skip: string;
	finish: string;
	tour: string;
}

export interface FeatureDiscoveryProps {
	mode: FeatureDiscoveryMode;
	targetRect?: FeatureDiscoveryTargetRect;
	title: string;
	description: string;
	illustration: FeatureDiscoveryIllustration;
	stepIndex: number;
	stepCount: number;
	labels: FeatureDiscoveryLabels;
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
	onFinish: () => void;
}

function renderFeatureIcon(illustration: FeatureDiscoveryIllustration) {
	switch (illustration) {
		case 'profile':
			return <UserCircle weight="duotone" />;
		case 'presence':
			return <Compass weight="duotone" />;
		case 'community-create':
			return <Plus weight="bold" />;
		case 'community-join':
			return <UserPlus weight="duotone" />;
		case 'community-settings':
			return <GearSix weight="duotone" />;
		case 'group-chat':
			return <UsersThree weight="duotone" />;
		default:
			return <ChatCircle weight="duotone" />;
	}
}

export function FeatureDiscovery({
	mode,
	targetRect,
	title,
	description,
	illustration,
	stepIndex,
	stepCount,
	labels,
	onNext,
	onBack,
	onSkip,
	onFinish,
}: FeatureDiscoveryProps) {
	const titleId = useId();
	const descriptionId = useId();
	const dialogRef = useRef<HTMLElement>(null);
	const isLastStep = stepIndex >= stepCount - 1;
	const safeCount = Math.max(stepCount, 1);
	const safeIndex = Math.min(Math.max(stepIndex, 0), safeCount - 1);
	const progress = ((safeIndex + 1) / safeCount) * 100;
	const rectStyle = targetRect
		? ({
				'--target-top': `${targetRect.top}px`,
				'--target-left': `${targetRect.left}px`,
				'--target-width': `${targetRect.width}px`,
				'--target-height': `${targetRect.height}px`,
			} as CSSProperties)
		: undefined;
	const targetPlacement =
		targetRect && typeof window !== 'undefined' && targetRect.top > window.innerHeight * 0.52 ? 'above' : 'below';
	const modeClassName =
		mode === 'spotlight' ? styles['mode-spotlight'] : mode === 'bottom-sheet' ? styles['mode-bottom-sheet'] : '';

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const firstControl = dialog.querySelector<HTMLElement>('button:not([disabled])');
		(firstControl ?? dialog).focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onSkip();
				return;
			}

			if (event.key !== 'Tab') return;
			const controls = Array.from(
				dialog.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			).filter((element) => !element.hasAttribute('hidden'));
			if (controls.length === 0) {
				event.preventDefault();
				dialog.focus();
				return;
			}

			const first = controls[0];
			const last = controls[controls.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onSkip]);

	const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter' && event.target === dialogRef.current) onNext();
	};

	return (
		<div
			className={`${styles.scrim} ${modeClassName}`}
			style={rectStyle}
			data-has-target={!!targetRect}
			data-target-placement={targetPlacement}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onSkip();
				}
			}}
		>
			{targetRect && <div className={styles.targetWindow} aria-hidden="true" />}
			<section
				ref={dialogRef}
				className={styles.dialog}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				tabIndex={-1}
				onKeyDown={handleDialogKeyDown}
			>
				<div className={styles.artwork} aria-hidden="true">
					<div className={styles.artworkOrbit} />
					<div className={styles.artworkMark}>
						{illustration === 'welcome' ? (
							<NEXUSIconMark className={styles.mark} />
						) : (
							<span className={styles.featureMark}>{renderFeatureIcon(illustration)}</span>
						)}
					</div>
					<div className={styles.brandStamp}>
						<NEXUSIconMark className={styles.stampMark} />
						<span>NEXUS</span>
						<span className={styles.stampDivider} />
						<span className={styles.stampCaption}>{labels.tour}</span>
					</div>
					<div className={`${styles.iconToken} ${styles.chatToken}`}>
						<ChatCircle weight="duotone" />
					</div>
					<div className={`${styles.iconToken} ${styles.voiceToken}`}>
						<Headphones weight="duotone" />
					</div>
					<div className={`${styles.iconToken} ${styles.communityToken}`}>
						<UsersThree weight="duotone" />
					</div>
					<span className={styles.artworkDot} />
				</div>

				<div className={styles.copy}>
					<div className={styles.eyebrow}>
						<span className={styles.liveDot} />
						<span className={styles.progressText}>
							{String(safeIndex + 1).padStart(2, '0')}
							<span className={styles.progressDivider}>/</span>
							{String(safeCount).padStart(2, '0')}
						</span>
					</div>
					<h2 className={styles.title} id={titleId}>
						{title}
					</h2>
					<p className={styles.description} id={descriptionId}>
						{description}
					</p>
					<div
						className={styles.progressTrack}
						role="progressbar"
						aria-label={title}
						aria-valuemin={1}
						aria-valuemax={safeCount}
						aria-valuenow={safeIndex + 1}
						aria-valuetext={`${safeIndex + 1} / ${safeCount}`}
					>
						<span className={styles.progressFill} style={{transform: `scaleX(${progress / 100})`}} />
					</div>
				</div>

				<div className={styles.actions}>
					<div className={styles.secondaryActions}>
						{safeIndex > 0 && (
							<button className={styles.backButton} type="button" onClick={onBack}>
								<ArrowLeft aria-hidden="true" size={16} weight="bold" />
								{labels.back}
							</button>
						)}
						<button className={styles.skipButton} type="button" onClick={onSkip}>
							{labels.skip}
						</button>
					</div>
					<button className={styles.primaryButton} type="button" onClick={isLastStep ? onFinish : onNext}>
						{isLastStep ? labels.finish : labels.next}
						<ArrowRight aria-hidden="true" size={17} weight="bold" />
					</button>
				</div>
			</section>
		</div>
	);
}

export default FeatureDiscovery;
