// SPDX-License-Identifier: Nebula

import {getNameEffectSettings, NAME_EFFECT_COLOR_COUNTS, updateNameEffectSettings, withNameColors} from '@app/features/user/components/profile/studio/nameStyleColors';
import {DesktopProfileEditor} from '@app/features/user/components/profile/studio/DesktopProfileEditor';
import {BottomSheet} from '@app/features/ui/bottom_sheet/BottomSheet';
import {ProfileDisplayName} from '@app/features/user/components/profile/media/ProfileDisplayName';
import {AvatarDecorationMedia, NameplateMedia, ProfileFrameMedia} from '@app/features/user/components/profile/media/ProfileMedia';
import {DECORATIONS, FRAMES, NAMEPLATES, PROFILE_EFFECTS} from '@app/features/user/components/profile/media/profileMediaCatalog';
import styles from '@app/features/user/components/profile/studio/ProfileCustomizationStudio.module.css';
import {PROFILE_POPOUT_GEOMETRY} from '@app/features/user/constants/UserProfileSurfaceGeometry';
import type {
	ProfileAppearance,
	ProfileCustomization,
} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {DEFAULT_PROFILE_CUSTOMIZATION} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {
	FrameCornersIcon,
	IdentificationCardIcon,
	ImageIcon,
	PaletteIcon,
	PencilSimpleIcon,
	ProhibitIcon,
	SparkleIcon,
	StarIcon,
	UserCircleIcon,
} from '@phosphor-icons/react';
import {type CSSProperties, cloneElement, type ReactElement, type ReactNode, useEffect, useRef, useState} from 'react';

interface ProfileCustomizationStudioProps {
	value: ProfileCustomization;
	onChange: (value: ProfileCustomization) => void;
	disabled?: boolean;
	displayName?: string;
	previewBio?: string | null;
	mobileNotice?: ReactNode;
	canEditDisplayName?: boolean;
	avatarUrl?: string | null;
	bannerUrl?: string | null;
	mobileEditor?: 'menu' | 'avatar' | 'cover' | 'name' | 'nameplate' | 'theme' | 'decoration' | 'effects' | 'frame' | 'details';
	onMobileEditorChange?: (
		editor: 'menu' | 'avatar' | 'cover' | 'name' | 'nameplate' | 'theme' | 'decoration' | 'effects' | 'frame' | 'details',
	) => void;
	mobilePreview?: ReactElement<{editorControls?: ReactNode}>;
desktopPreview?: ReactElement;
	themeColorControls?: ReactNode;
	mobileAvatarControls?: ReactNode;
	mobileCoverControls?: ReactNode;
	mobileDetailsControls?: (nameStyleControl: ReactNode) => ReactNode;
	mobileInlineDetailsControls?: (nameStyleControl: ReactNode) => ReactNode;
desktopAvatarControls?: ReactElement<{autoOpen?: boolean; onAutoOpen?: () => void}>;
desktopCoverControls?: ReactElement<{autoOpen?: boolean; onAutoOpen?: () => void}>;
	desktopDetailsControls?: ReactNode;
	mobileAvatarPreviewUrl?: string | null;
	mobileCoverPreviewUrl?: string | null;
	profileScopeLabel?: string;
	onDisplayNameChange?: (name: string) => void;
	renderDesktopPreview?: (value: ProfileCustomization) => ReactNode;
	desktopNameplateControls?: ReactNode;
	renderDesktopNameplateControls?: (
		settings: ProfileCustomization['nameplateSettings'],
		onChange: (settings: Partial<ProfileCustomization['nameplateSettings']>) => void,
	) => ReactNode;
	pending?: boolean;
	onDialogBegin?: (tool: DesktopTool, value: ProfileCustomization) => void;
	onDialogCommit?: (tool: DesktopTool, value: ProfileCustomization) => void;
	onDialogCancel?: (tool: DesktopTool) => void;
	onBack?: () => void;
}

type NameCategory = 'color' | 'light' | 'motion';
type DesktopTool = 'nameplate' | 'avatar' | 'decoration' | 'name' | 'colors' | 'cover' | 'profile-effects' | 'frame' | 'details';
type NameEffect = ProfileAppearance['nameEffect'];
type NameFont = ProfileAppearance['nameFont'];
type Speed = 'slow' | 'normal' | 'fast';
type NameStyleSubEditor = 'font' | 'effect' | 'color';
type MobileDraftEditor = 'name' | 'decoration' | 'effects' | 'frame' | 'nameplate';

function isMobileDraftEditor(editor: ProfileCustomizationStudioProps['mobileEditor']): editor is MobileDraftEditor {
	return editor === 'name' || editor === 'decoration' || editor === 'effects' || editor === 'frame' || editor === 'nameplate';
}

function mergeNameStyleAppearance(current: ProfileAppearance, draft: ProfileAppearance): ProfileAppearance {
	return {
		...current,
		nameStyleEnabled: draft.nameStyleEnabled,
		nameFont: draft.nameFont,
		nameEffect: draft.nameEffect,
		nameAnimation: draft.nameAnimation,
		nameColorEnabled: draft.nameColorEnabled,
		nameColorStart: draft.nameColorStart,
		nameColorEnd: draft.nameColorEnd,
		nameEffectColors: draft.nameEffectColors,
		nameAnimationColors: draft.nameAnimationColors,
		nameEffects: draft.nameEffects,
	};
}

const FONT_CHOICES: ReadonlyArray<{value: NameFont; label: string; family: string}> = [
	{value: 'nexus', label: 'NEXUS Sans', family: 'inherit'},
	{value: 'editorial', label: 'Editorial', family: 'Georgia, serif'},
	{value: 'terminal', label: 'Terminal', family: 'ui-monospace, monospace'},
	{value: 'rounded', label: 'Rounded', family: '"Trebuchet MS", sans-serif'},
	{value: 'display', label: 'Display', family: 'Impact, sans-serif'},
	{value: 'classic', label: 'Classic', family: '"Times New Roman", Times, serif'},
	{value: 'wide', label: 'Wide', family: '"Arial Black", Arial, sans-serif'},
	{value: 'stencil', label: 'Stencil', family: 'Impact, sans-serif'},
	{value: 'typewriter', label: 'Typewriter', family: '"Courier New", Courier, monospace'},
	{value: 'humanist', label: 'Humanist', family: 'Verdana, Geneva, sans-serif'},
	{value: 'compact', label: 'Compact', family: 'Tahoma, Arial, sans-serif'},
	{value: 'refined', label: 'Refined', family: 'Garamond, "Palatino Linotype", serif'},
	{value: 'handwritten', label: 'Handwritten', family: 'cursive'},
	{value: 'geometric', label: 'Geometric', family: '"Century Gothic", "Trebuchet MS", sans-serif'},
];

const CATEGORIES: ReadonlyArray<{value: NameCategory; label: string; description: string}> = [
	{value: 'color', label: 'Color', description: 'From a clean single hue to gradients and color-per-letter styles.'},
	{value: 'light', label: 'Light', description: 'Soft glow, polished highlights, and crisp outlines.'},
	{value: 'motion', label: 'Motion', description: 'Move the letters or send color flowing across the name.'},
];

const EFFECTS: ReadonlyArray<{value: NameEffect; label: string; category: NameCategory}> = [
	{value: 'solid', label: 'Pure Color', category: 'color'},
	{value: 'gradient', label: 'Silk Gradient', category: 'color'},
	{value: 'prism', label: 'Prism', category: 'color'},
	{value: 'spectrum', label: 'Letter Spectrum', category: 'color'},
	{value: 'neon', label: 'Halo', category: 'light'},
	{value: 'outline', label: 'Contour', category: 'light'},
	{value: 'shimmer', label: 'Glimmer', category: 'light'},
	{value: 'aurora', label: 'Aurora', category: 'light'},
	{value: 'echo', label: 'Afterglow', category: 'light'},
	{value: 'glass', label: 'Glasslight', category: 'light'},
	{value: 'ember', label: 'Ember', category: 'light'},
	{value: 'frost', label: 'Frost', category: 'light'},
	{value: 'flow', label: 'Color Current', category: 'motion'},
	{value: 'pulse', label: 'Heartbeat', category: 'motion'},
	{value: 'wave', label: 'Letter Wave', category: 'motion'},
	{value: 'bounce', label: 'Letter Lift', category: 'motion'},
	{value: 'flicker', label: 'Spark', category: 'motion'},
	{value: 'comet', label: 'Comet Trail', category: 'motion'},
	{value: 'ripple', label: 'Radiant Ripple', category: 'motion'},
	{value: 'orbit', label: 'Color Orbit', category: 'motion'},
];

const PALETTES: ReadonlyArray<ReadonlyArray<string>> = [
	['#48E6D0', '#7B8CFF', '#E4A8FF', '#F06CA8', '#F7D56A'],
	['#FF9C68', '#F06CA8', '#E4A8FF', '#7A71F5', '#34C4D8'],
	['#93E46D', '#34C4D8', '#48E6D0', '#7B8CFF', '#E4A8FF'],
	['#F7D56A', '#F08068', '#F06CA8', '#B65CF0', '#7A71F5'],
	['#E7ECF4', '#8CA7C9', '#7B8CFF', '#48E6D0', '#93E46D'],
	['#F08068', '#F7D56A', '#93E46D', '#34C4D8', '#7A71F5'],
	['#7B8CFF', '#E4A8FF', '#F06CA8', '#F7D56A', '#48E6D0'],
	['#F06CA8', '#E4A8FF', '#7A71F5', '#34C4D8', '#FF9C68'],
];

const DIRECTION_EFFECTS = new Set<NameEffect>(['gradient', 'shimmer', 'prism', 'flow', 'aurora', 'wave', 'bounce', 'comet', 'orbit']);
const SPEED_EFFECTS = new Set<NameEffect>(['shimmer', 'flow', 'pulse', 'spectrum', 'wave', 'bounce', 'flicker', 'comet', 'ripple', 'orbit', 'ember', 'frost']);
const INTENSITY_EFFECTS = new Set<NameEffect>(['neon', 'outline', 'echo', 'pulse', 'wave', 'bounce', 'comet', 'ripple', 'ember', 'frost']);

const NAMEPLATE_LEGACY_ALIASES: Record<string, string> = {
	signal: 'purple-flame',
	orbit: 'falling-stars',
	horizon: 'aurora',
	'cyber-grid': 'snow-forest',
};

const CARD_EFFECTS = ['none', 'aurora', 'particles', 'scan'] as const;

const paletteForEffect = (palette: ReadonlyArray<string>, count: number) =>
	Array.from({length: count}, (_, index) => palette[index % palette.length] ?? palette[0] ?? '#48E6D0');

export function ProfileCustomizationStudio({
	value,
	onChange,
	disabled = false,
	mobileEditor = 'menu',
	onMobileEditorChange,
	mobilePreview,
	themeColorControls,
	mobileAvatarControls,
	mobileCoverControls,
	mobileDetailsControls,
		mobileInlineDetailsControls,
	desktopAvatarControls,
	desktopCoverControls,
	desktopDetailsControls,
	mobileAvatarPreviewUrl,
	mobileCoverPreviewUrl,
	desktopPreview,
avatarUrl,
bannerUrl,
displayName,
	previewBio,
	mobileNotice,
	canEditDisplayName = true,
	profileScopeLabel = 'Main profile',
	onDisplayNameChange,
	renderDesktopPreview,
	desktopNameplateControls,
	renderDesktopNameplateControls,
	pending = false,
	onDialogBegin,
	onDialogCommit,
	onDialogCancel,
	onBack,
}: ProfileCustomizationStudioProps) {
	const [effectCategory, setEffectCategory] = useState<NameCategory>('color');
const [mobileMotionReplayKey, setMobileMotionReplayKey] = useState(0);
const [mobileNameReplayKey, setMobileNameReplayKey] = useState(0);
	const [mobileDraftValue, setMobileDraftValue] = useState<ProfileCustomization | null>(null);
	const [nameStyleSubEditor, setNameStyleSubEditor] = useState<NameStyleSubEditor | null>(null);
	const [nameStyleSubDraft, setNameStyleSubDraft] = useState<ProfileAppearance | null>(null);
	const lastMobileEditorRef = useRef<typeof mobileEditor | null>(null);
	const appearance = value?.appearance ?? DEFAULT_PROFILE_CUSTOMIZATION.appearance;
	const effect = appearance.nameEffect;
	const currentNameplate = value.nameplateSettings.nameplate;
	const canonicalNameplate = NAMEPLATE_LEGACY_ALIASES[currentNameplate] ?? currentNameplate;
	const canonicalFrame = ({orbit: 'fox', snake: 'lion'} as Record<string, string>)[appearance.cardFrame] ?? appearance.cardFrame;

	useEffect(() => {
		if (lastMobileEditorRef.current === mobileEditor) return;
		lastMobileEditorRef.current = mobileEditor;
		setNameStyleSubEditor(null);
		setNameStyleSubDraft(null);
		if (isMobileDraftEditor(mobileEditor)) {
			setMobileDraftValue(value);
			return;
		}
		setMobileDraftValue(null);
	}, [mobileEditor, value]);

	useEffect(() => {
		const category = EFFECTS.find((item) => item.value === effect)?.category;
		if (category) setEffectCategory(category);
	}, [effect]);

	const updateAppearance = (patch: Partial<ProfileAppearance>) =>
		onChange({...value, appearance: {...appearance, ...patch}});
	const activeMobileDraft = mobileDraftValue ?? value;
	const activeMobileAppearance = activeMobileDraft.appearance ?? appearance;
	const activeMobileNameplate = activeMobileDraft.nameplateSettings.nameplate;
	const activeMobileCanonicalNameplate = NAMEPLATE_LEGACY_ALIASES[activeMobileNameplate] ?? activeMobileNameplate;
	const activeMobileCanonicalFrame = ({orbit: 'fox', snake: 'lion'} as Record<string, string>)[activeMobileAppearance.cardFrame] ?? activeMobileAppearance.cardFrame;
	const nameEditorAppearance = nameStyleSubDraft ?? activeMobileAppearance;
	const nameEditorEffect = nameEditorAppearance.nameEffect;
	const nameEditorEffectSettings = getNameEffectSettings(nameEditorAppearance, nameEditorEffect);
	const nameEditorColors = nameEditorEffectSettings.colors;
	const nameEditorCount = NAME_EFFECT_COLOR_COUNTS[nameEditorEffect];
	const nameEditorSelectedEffect = EFFECTS.find((item) => item.value === nameEditorEffect);
	const visibleEffects = EFFECTS.filter((item) => item.category === effectCategory);
	const setNameDraftEffect = (source: ProfileAppearance, nextEffect: NameEffect): ProfileAppearance => {
		const nextColors = getNameEffectSettings(source, nextEffect).colors;
		return {
			...source,
			nameEffect: nextEffect,
			nameAnimation: 'off',
			nameStyleEnabled: true,
			nameColorEnabled: true,
			nameEffects: {
				...source.nameEffects,
				[nextEffect]: {
					...(source.nameEffects?.[nextEffect] ?? {}),
					colors: nextColors,
				},
			},
		};
	};
	const openNameStyleSubEditor = (editor: NameStyleSubEditor) => {
		const draft = mobileDraftValue?.appearance ?? appearance;
		setNameStyleSubDraft(draft);
		if (editor === 'effect') {
			const category = EFFECTS.find((item) => item.value === draft.nameEffect)?.category;
			if (category) setEffectCategory(category);
		}
		setNameStyleSubEditor(editor);
	};
	const closeNameStyleSubEditor = () => {
		setNameStyleSubEditor(null);
		setNameStyleSubDraft(null);
	};
	const confirmNameStyleSubEditor = () => {
		if (!nameStyleSubDraft) return;
		setMobileDraftValue((current) => ({...(current ?? value), appearance: nameStyleSubDraft}));
		closeNameStyleSubEditor();
	};
	const updateNameStyleDraft = (patch: Partial<ProfileAppearance>) => {
		const draft = nameStyleSubDraft ?? mobileDraftValue?.appearance ?? appearance;
		setNameStyleSubDraft({...draft, ...patch});
	};
	const updateNameEffectDraft = (patch: Partial<NonNullable<ProfileAppearance['nameEffects']>[NameEffect]>) => {
		const draft = nameStyleSubDraft ?? mobileDraftValue?.appearance ?? appearance;
		setNameStyleSubDraft(updateNameEffectSettings(draft, draft.nameEffect, patch));
	};
	const setNameColorDraft = (nextColors: Array<string>) => {
		const draft = nameStyleSubDraft ?? mobileDraftValue?.appearance ?? appearance;
		setNameStyleSubDraft(withNameColors(draft, nextColors));
	};
	const updateMobileDraft = (nextValue: ProfileCustomization) => setMobileDraftValue(nextValue);
	const setMobileDraftAppearance = (patch: Partial<ProfileAppearance>) =>
		updateMobileDraft({...activeMobileDraft, appearance: {...activeMobileAppearance, ...patch}});
	const setMobileDraftNameplate = (patch: Partial<ProfileCustomization['nameplateSettings']>) =>
		updateMobileDraft({...activeMobileDraft, nameplateSettings: {...activeMobileDraft.nameplateSettings, ...patch}});
	const confirmMobileEditor = () => {
		const draft = mobileDraftValue ?? value;
		switch (mobileEditor) {
			case 'name':
				onChange({...value, appearance: mergeNameStyleAppearance(value.appearance, draft.appearance)});
				break;
			case 'decoration':
				onChange({...value, appearance: {...value.appearance, avatarDecoration: draft.appearance.avatarDecoration}});
				break;
			case 'effects':
				onChange({...value, profileEffectId: draft.profileEffectId});
				break;
			case 'frame':
				onChange({...value, appearance: {...value.appearance, cardFrame: draft.appearance.cardFrame}});
				break;
			case 'nameplate':
				onChange({
					...value,
					nameplateSettings: {
						...value.nameplateSettings,
						nameplate: draft.nameplateSettings.nameplate,
						nameplateImage: draft.nameplateSettings.nameplateImage,
						nameplateCrop: draft.nameplateSettings.nameplateCrop,
					},
				});
				break;
		}
		setMobileDraftValue(null);
		setNameStyleSubEditor(null);
		setNameStyleSubDraft(null);
		onMobileEditorChange?.('menu');
	};
	const closeMobileEditor = () => {
		setMobileDraftValue(null);
		setNameStyleSubEditor(null);
		setNameStyleSubDraft(null);
		onMobileEditorChange?.('menu');
	};
	const updateNameplateSettings = (patch: Partial<ProfileCustomization['nameplateSettings']>) =>
		onChange({...value, nameplateSettings: {...value.nameplateSettings, ...patch}});
	const setNameplate = (id: string) => setMobileDraftNameplate({
		nameplate: id as typeof value.nameplateSettings.nameplate,
		nameplateImage: null,
		nameplateCrop: null,
	});
	const inputClass = styles.field;
	const mobileSections: ReadonlyArray<{id: Exclude<typeof mobileEditor, 'menu'>; title: string; detail: string; icon: ReactNode}> = [
		{id: 'cover', title: 'Cover image', detail: 'Change profile cover', icon: (mobileCoverPreviewUrl ?? bannerUrl) ? <img className={styles.mobileMenuThumbnail} src={(mobileCoverPreviewUrl ?? bannerUrl) ?? undefined} alt="" /> : <ImageIcon size={20} weight="duotone" />},
		{id: 'avatar', title: 'Profile image', detail: 'Change avatar image', icon: (mobileAvatarPreviewUrl ?? avatarUrl) ? <img className={styles.mobileMenuThumbnail} src={(mobileAvatarPreviewUrl ?? avatarUrl) ?? undefined} alt="" /> : <UserCircleIcon size={20} weight="duotone" />},
{id: 'theme', title: 'More theme settings', detail: 'Atmosphere, cover focus and divider', icon: <PaletteIcon size={20} weight="duotone" />},
		{id: 'name', title: 'Name style', detail: `${FONT_CHOICES.find((font) => font.value === appearance.nameFont)?.label ?? 'NEXUS Sans'} · ${EFFECTS.find((item) => item.value === appearance.nameEffect)?.label ?? 'Pure Color'}`, icon: <PencilSimpleIcon size={20} weight="duotone" />},
		{id: 'nameplate', title: 'Nameplate', detail: NAMEPLATES.find((item) => item.id === canonicalNameplate)?.label ?? (currentNameplate === 'none' ? 'No nameplate' : 'Choose a nameplate'), icon: <ImageIcon size={20} weight="duotone" />},
		{id: 'effects', title: 'Profile effects', detail: PROFILE_EFFECTS.find((item) => item.id === value.profileEffectId)?.name ?? 'Choose an effect', icon: <SparkleIcon size={20} weight="duotone" />},
		{id: 'decoration', title: 'Avatar decoration', detail: DECORATIONS.find((item) => item.id === appearance.avatarDecoration)?.label ?? (appearance.avatarDecoration === 'none' ? 'None' : 'Choose a decoration'), icon: <StarIcon size={20} weight="duotone" />},
		{id: 'frame', title: 'Profile frame', detail: FRAMES.find((frame) => frame.id === canonicalFrame)?.name ?? 'Choose a frame', icon: <FrameCornersIcon size={20} weight="duotone" />},
		{id: 'details', title: 'Profile details', detail: 'Name, pronouns and bio', icon: <IdentificationCardIcon size={20} weight="duotone" />},
	];

const mobileMenuSections = [
	mobileSections.find((item) => item.id === 'decoration'),
	mobileSections.find((item) => item.id === 'effects'),
	mobileSections.find((item) => item.id === 'frame'),
	mobileSections.find((item) => item.id === 'nameplate'),
	mobileSections.find((item) => item.id === 'theme'),
].filter((item): item is (typeof mobileSections)[number] => item !== undefined);
const mobileNameStyleControl = (
	<nav className={styles.mobileMenu} aria-label="Display name style">
		<button type="button" disabled={disabled} onClick={() => onMobileEditorChange?.('name')}>
			<span className={styles.mobileMenuIcon} data-action="name" aria-hidden="true"><PencilSimpleIcon size={20} weight="duotone" /></span>
			<span className={styles.mobileMenuText}>
				<strong>Display name style</strong>
				<small>{FONT_CHOICES.find((font) => font.value === appearance.nameFont)?.label ?? 'NEXUS Sans'} · {EFFECTS.find((item) => item.value === appearance.nameEffect)?.label ?? 'Pure Color'}</small>
			</span>
		</button>
	</nav>
);

	const avatarControls = mobilePreview ? mobileAvatarControls : desktopAvatarControls;
	const coverControls = mobilePreview ? mobileCoverControls : desktopCoverControls;
const detailsControls = mobilePreview ? mobileDetailsControls?.(mobileNameStyleControl) : desktopDetailsControls;
	const inlineDetailsControls = mobilePreview
		? (mobileInlineDetailsControls?.(mobileNameStyleControl) ?? detailsControls)
		: desktopDetailsControls;

	const studioControls = (
		<>
			{mobileEditor === 'menu' && inlineDetailsControls != null && (
				<section
					data-mobile-section="details"
					className={`${styles.section} ${styles.profileDetailsSection} ${styles.mobileInlineProfileDetails}`}
					aria-label="Profile details"
					data-flx="user.profile-customization-studio.mobile-inline-profile-details"
				>
					<div className={styles.profileDetailsFields} data-flx="user.profile-customization-studio.mobile-inline-details-fields">
						{inlineDetailsControls}
					</div>
				</section>
			)}
{mobileEditor === 'menu' && themeColorControls != null && (
	<section className={styles.mobileThemeControl} aria-label="Profile theme colors">
		{themeColorControls}
	</section>
)}
			{mobileEditor === 'menu' && (
				<nav className={styles.mobileMenu} aria-label="Profile appearance settings">
{mobileMenuSections.map((item) => (
						<button type="button" key={item.id} onClick={() => onMobileEditorChange?.(item.id)}>
							<span className={styles.mobileMenuIcon} data-action={item.id} aria-hidden="true">{item.icon}</span>
							<span className={styles.mobileMenuText}><strong>{item.title}</strong><small>{item.detail}</small></span>
						</button>
					))}
				</nav>
			)}
			{mobileEditor !== 'menu' && (
				<BottomSheet
					isOpen={true}
					onClose={closeMobileEditor}
					title={mobileSections.find((item) => item.id === mobileEditor)?.title}
					initialSnap={1}
					snapPoints={[0, 0.72, 0.94, 1]}
					surface="primary"
					contentClassName={styles.mobileSheetContent}
					containerClassName={styles.mobileSheet}
				>
					<div className={styles.mobileSheetBody} data-mobile-editor={mobileEditor}>
			{avatarControls != null && (
				<section data-mobile-section="avatar" className={`${styles.section} ${styles.assetSection}`} aria-label="Profile image settings">
					{avatarControls}
				</section>
			)}
			{coverControls != null && (
				<section data-mobile-section="cover" className={`${styles.section} ${styles.assetSection}`} aria-label="Profile cover settings">
					{coverControls}
				</section>
			)}
			<section data-mobile-section="name" className={`${styles.section} ${styles.nameAppearanceSection}`} aria-labelledby="profile-name-heading">
				<div className={styles.sectionHeading}>
					<span className={styles.kicker}>NAME APPEARANCE</span>
					<div><h3 id="profile-name-heading">Name style</h3><p className={styles.note}>Preview each choice, then apply it to your profile.</p></div>
				</div>
				<div className={styles.mobilePreviewToolbar}><span>SERVER &amp; MESSAGE PREVIEW</span><button type="button" disabled={disabled} onClick={() => setMobileNameReplayKey((key) => key + 1)}>Replay</button></div>
				<div className={styles.mobileMemberRowPreview} key={mobileNameReplayKey}>
					{activeMobileDraft.nameplateSettings.nameplate !== 'none' && <NameplateMedia settings={activeMobileDraft.nameplateSettings} />}
					<span className={styles.mobileMemberAvatar}>{avatarUrl ? <img src={avatarUrl} alt="" /> : (displayName || 'N').slice(0, 1).toUpperCase()}</span>
					<span className={styles.mobileMemberIdentity}>
						<strong><ProfileDisplayName name={displayName || 'Your name'} appearance={activeMobileAppearance} /></strong>
						<small>@member · online</small>
						{previewBio?.trim() && <small className={styles.mobileMemberBio}>{previewBio}</small>}
					</span>
				</div>
				<label className={styles.toggleRow}>
					<input type="checkbox" checked={activeMobileAppearance.nameStyleEnabled} disabled={disabled} onChange={(event) => setMobileDraftAppearance({nameStyleEnabled: event.currentTarget.checked})} />
					<span>Custom name style</span>
				</label>
				<div className={styles.mobileNameStyleRows} role="group" aria-label="Name style settings">
					<button type="button" disabled={disabled} onClick={() => openNameStyleSubEditor('font')}>
						<span className={styles.mobileNameStyleSample} style={{fontFamily: FONT_CHOICES.find((font) => font.value === activeMobileAppearance.nameFont)?.family}}>Aa</span>
						<span><small>Font</small><strong>{FONT_CHOICES.find((font) => font.value === activeMobileAppearance.nameFont)?.label ?? 'NEXUS Sans'}</strong></span>
						<span className={styles.mobileNameStyleChevron} aria-hidden="true">›</span>
					</button>
					<button type="button" disabled={disabled} onClick={() => openNameStyleSubEditor('effect')}>
						<span
							className={styles.mobileNameStyleEffectSample}
							style={{
								'--effect-start': getNameEffectSettings(activeMobileAppearance, activeMobileAppearance.nameEffect).colors[0],
								'--effect-end': getNameEffectSettings(activeMobileAppearance, activeMobileAppearance.nameEffect).colors.at(-1),
							} as CSSProperties}
							aria-hidden="true"
						>Aa</span>
						<span><small>Effect</small><strong>{EFFECTS.find((item) => item.value === activeMobileAppearance.nameEffect)?.label ?? 'Pure Color'}</strong></span>
						<span className={styles.mobileNameStyleChevron} aria-hidden="true">›</span>
					</button>
					<button type="button" disabled={disabled} onClick={() => openNameStyleSubEditor('color')}>
						<span className={styles.mobileNameColorSwatches} aria-hidden="true">
							{getNameEffectSettings(activeMobileAppearance, activeMobileAppearance.nameEffect).colors.slice(0, 3).map((color, index) => <i key={`${color}-${index}`} style={{backgroundColor: color}} />)}
						</span>
						<span><small>Color</small><strong>Customize {EFFECTS.find((item) => item.value === activeMobileAppearance.nameEffect)?.label ?? 'Pure Color'}</strong></span>
						<span className={styles.mobileNameStyleChevron} aria-hidden="true">›</span>
					</button>
				</div>
			</section>

			<section data-mobile-section="decoration" className={`${styles.section} ${styles.portraitSection}`} aria-labelledby="profile-portrait-heading">
				<div className={styles.sectionHeading}>
					<span className={styles.kicker}>PORTRAIT</span>
					<div><h3 id="profile-portrait-heading">Avatar decoration</h3><p className={styles.note}>Choose an animation around your circular profile image.</p></div>
				</div>
				{renderDesktopPreview && <div className={styles.mobileEffectLivePreview}>
					<div className={styles.mobilePreviewToolbar}><span>LIVE PROFILE CARD</span></div>
					<div className={styles.mobileEffectPreviewCanvas}>{renderDesktopPreview(activeMobileDraft)}</div>
				</div>}
				<div className={styles.mobileDecorationGrid} role="group" aria-label="Choose an avatar decoration">
					<button type="button" disabled={disabled} aria-pressed={activeMobileAppearance.avatarDecoration === 'none'} data-selected={activeMobileAppearance.avatarDecoration === 'none'} onClick={() => setMobileDraftAppearance({avatarDecoration: 'none'})}>
						<span className={styles.mobileDecorationAvatar}>
							<span className={styles.mobileDecorationAvatarImage}>{avatarUrl ? <img src={avatarUrl} alt="" /> : (displayName || 'N').slice(0, 1).toUpperCase()}</span>
							<span className={styles.mobileDecorationNone}><ProhibitIcon size={20} weight="bold" /></span>
						</span>
						<strong>None</strong>
					</button>
					{DECORATIONS.map((decoration) => (
						<button type="button" key={decoration.id} disabled={disabled} aria-pressed={activeMobileAppearance.avatarDecoration === decoration.id} data-selected={activeMobileAppearance.avatarDecoration === decoration.id} onClick={() => setMobileDraftAppearance({avatarDecoration: decoration.id})}>
							<span className={styles.mobileDecorationAvatar}>
								<span className={styles.mobileDecorationAvatarImage}>{avatarUrl ? <img src={avatarUrl} alt="" /> : (displayName || 'N').slice(0, 1).toUpperCase()}</span>
								<AvatarDecorationMedia decoration={decoration.id} size={90} />
							</span>
							<strong>{decoration.label}</strong>
						</button>
					))}
				</div>
			</section>

			<section data-mobile-section="theme" className={`${styles.section} ${styles.cardAtmosphereSection}`} aria-labelledby="profile-atmosphere-heading">
				<div className={styles.sectionHeading}>
					<span className={styles.kicker}>THEME COLORS</span>
					<div><h3 id="profile-atmosphere-heading">Theme colors</h3></div>
				</div>
				{themeColorControls && <div className={styles.themeColorControls}>{themeColorControls}</div>}
				<div className={styles.controlGrid}>
					<label className={styles.controlGroup}>
						<span>Card atmosphere</span>
						<select className={inputClass} value={appearance.cardEffect} disabled={disabled} onChange={(event) => updateAppearance({cardEffect: event.currentTarget.value})}>
							{CARD_EFFECTS.map((cardEffect) => <option key={cardEffect} value={cardEffect}>{cardEffect}</option>)}
						</select>
					</label>
					<label className={styles.controlGroup}>
						<span>Divider color</span>
						<select className={inputClass} value={appearance.dividerMode} disabled={disabled} onChange={(event) => updateAppearance({dividerMode: event.currentTarget.value as ProfileAppearance['dividerMode']})}>
							<option value="default">Auto Contrast</option><option value="custom">Custom Color</option>
						</select>
					</label>
					{appearance.dividerMode === 'custom' && <label className={styles.controlGroup}>
						<span>Divider color</span>
						<input className={styles.colorPicker} type="color" value={appearance.dividerCustomColor ?? '#48e6d0'} disabled={disabled} onChange={(event) => updateAppearance({dividerCustomColor: event.currentTarget.value})} />
					</label>}
				</div>
				<div className={styles.positionControls} data-mobile-control="cover-position">
					<span className={styles.fieldLabel}>Focus point</span>
					{(['x', 'y'] as const).map((axis) => {
						const position = appearance.coverPosition ?? {x: 50, y: 50};
						return <label className={styles.controlGroup} key={axis}>
							<span>{axis === 'x' ? 'Horizontal' : 'Vertical'} <b>{position[axis]}%</b></span>
							<input
								type="range"
								min="0"
								max="100"
								value={position[axis]}
								disabled={disabled}
								onChange={(event) => updateAppearance({coverPosition: {...position, [axis]: Number(event.currentTarget.value)}})}
							/>
						</label>;
					})}
				</div>
			</section>

			<section data-mobile-section="motion" className={`${styles.section} ${styles.motionFrameSection}`} aria-labelledby="profile-motion-heading">
				<div className={styles.sectionHeading}>
					<span className={styles.kicker}>MOTION &amp; FRAME</span>
					<div><h3 id="profile-motion-heading">{mobileEditor === 'frame' ? 'Profile frame' : 'Profile effect'}</h3><p className={styles.note}>Previewed on the full profile card.</p></div>
				</div>
{renderDesktopPreview && <div className={styles.mobileEffectLivePreview}>
<div className={styles.mobilePreviewToolbar}><span>LIVE PROFILE CARD</span><button type="button" disabled={disabled} onClick={() => setMobileMotionReplayKey((key) => key + 1)}>Replay</button></div>
<div className={styles.mobileEffectPreviewCanvas} key={mobileMotionReplayKey}>{renderDesktopPreview(activeMobileDraft)}</div>
</div>}
				<div className={styles.controlGrid}>
					<div className={styles.controlGroup} data-mobile-control="frame">
						<span>Choose a frame</span>
						<div className={styles.mobileFrameGrid} role="group" aria-label="Choose a profile frame">
{FRAMES.map((frame) => (
<button type="button" key={frame.id} disabled={disabled} aria-pressed={activeMobileCanonicalFrame === frame.id} data-selected={activeMobileCanonicalFrame === frame.id} onClick={() => {setMobileDraftAppearance({cardFrame: frame.id}); setMobileMotionReplayKey((key) => key + 1);}}>
									<span className={styles.mobileFramePreview}>
										{frame.id === 'none' ? <ProhibitIcon size={22} weight="bold" /> : <ProfileFrameMedia frame={frame.id} size={58} />}
									</span>
									<strong>{frame.name}</strong>
								</button>
							))}
						</div>
					</div>
					<div className={styles.controlGroup} data-mobile-control="effects">
						<span>Choose a profile effect</span>
						<div className={styles.mobileProfileEffectGrid} role="group" aria-label="Choose a profile effect">
<button type="button" disabled={disabled} aria-pressed={!activeMobileDraft.profileEffectId} data-selected={!activeMobileDraft.profileEffectId} onClick={() => {updateMobileDraft({...activeMobileDraft, profileEffectId: null}); setMobileMotionReplayKey((key) => key + 1);}}>
								<span className={styles.mobileProfileEffectPreview}><ProhibitIcon size={22} weight="bold" /></span>
								<strong>None</strong>
							</button>
							{PROFILE_EFFECTS.map((item) => (
<button type="button" key={item.id} disabled={disabled} aria-pressed={activeMobileDraft.profileEffectId === item.id} data-selected={activeMobileDraft.profileEffectId === item.id} onClick={() => {updateMobileDraft({...activeMobileDraft, profileEffectId: item.id}); setMobileMotionReplayKey((key) => key + 1);}}>
									<span className={styles.mobileProfileEffectPreview}>
										{item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" />}
										<span className={styles.mobileEffectBadge} aria-hidden="true">PROFILE</span>
									</span>
									<strong>{item.name}</strong>
								</button>
							))}
						</div>
					</div>
				</div>
				<details className={styles.credits} data-mobile-control="effect-credits">
					<summary>Credits</summary>
					<ul>
<li><a href="https://rive.app/marketplace/6071-11818-a-sassy-crocodile/" target="_blank" rel="noreferrer">A Sassy Crocodile</a><span> — Nate_Kling, CC BY 4.0.</span></li>
<li><a href="https://rive.app/marketplace/28085-53046-animated-ocean-scene/" target="_blank" rel="noreferrer">Ocean Life</a><span> — serpil, CC BY 4.0.</span></li>
<li><a href="https://rive.app/marketplace/28173-53200-minimal-fish-animation/" target="_blank" rel="noreferrer">Swimming Fish</a><span> — shivr, CC BY 4.0.</span></li>
<li><a href="https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/Fox" target="_blank" rel="noreferrer">Fox 3D</a><span> — PixelMannen (model), tomkranis (rigging and animation); CC0 / CC BY 4.0.</span></li>
					</ul>
				</details>
			</section>

			<section data-mobile-section="nameplate" className={`${styles.section} ${styles.nameplateSection}`} aria-labelledby="profile-nameplate-heading">
				<div className={styles.sectionHeading}>
					<span className={styles.kicker}>NAME ANIMATION</span>
					<div><h3 id="profile-nameplate-heading">Nameplate</h3><p className={styles.note}>Previewed on your server member row and messages.</p></div>
				</div>
				<div className={styles.mobileMemberRowPreview}>
					{activeMobileNameplate !== 'none' && <NameplateMedia settings={activeMobileDraft.nameplateSettings} />}
					<span className={styles.mobileMemberAvatar}>{avatarUrl ? <img src={avatarUrl} alt="" /> : (displayName || 'N').slice(0, 1).toUpperCase()}</span>
					<span className={styles.mobileMemberIdentity}>
						<strong><ProfileDisplayName name={displayName || 'Your name'} appearance={activeMobileAppearance} /></strong>
						<small>@member · online</small>
						{previewBio?.trim() && <small className={styles.mobileMemberBio}>{previewBio}</small>}
					</span>
				</div>
				{renderDesktopNameplateControls && <div className={styles.mobileNameplateUpload}>{renderDesktopNameplateControls(value.nameplateSettings, updateNameplateSettings)}</div>}
				<div className={styles.mobileNameplateGrid}>
					<button type="button" disabled={disabled} aria-pressed={activeMobileNameplate === 'none'} data-selected={activeMobileNameplate === 'none'} onClick={() => setNameplate('none')}>
						<span className={styles.mobileNameplatePreview}><ProhibitIcon size={22} weight="bold" /></span>
						<strong>No nameplate</strong>
					</button>
					{NAMEPLATES.map((item) => {
						const selected = activeMobileCanonicalNameplate === item.id;
						const settings = {...activeMobileDraft.nameplateSettings, nameplate: item.id, nameplateImage: null, nameplateCrop: null};
						return (
							<button type="button" key={item.id} disabled={disabled} aria-pressed={selected} data-selected={selected} onClick={() => setNameplate(item.id)}>
								<span className={styles.mobileNameplatePreview}>
									{item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" /> : <NameplateMedia settings={settings} />}
								</span>
								<strong>{item.label}</strong>
							</button>
						);
					})}
					{(value.nameplateSettings.nameplateUploads ?? []).map((upload) => {
						const selected = activeMobileNameplate === 'custom' && activeMobileDraft.nameplateSettings.nameplateImage === upload.filename;
						const settings = {...activeMobileDraft.nameplateSettings, nameplate: 'custom' as const, nameplateImage: upload.filename};
						return (
							<button type="button" key={upload.filename} disabled={disabled} aria-pressed={selected} data-selected={selected} onClick={() => setMobileDraftNameplate({nameplate: 'custom', nameplateImage: upload.filename, nameplateCrop: null})}>
								<span className={styles.mobileNameplatePreview}><NameplateMedia settings={settings} /></span>
								<strong>{upload.filename}</strong>
							</button>
						);
					})}
				</div>
			</section>
			{detailsControls != null && (
				<section data-mobile-section="details" className={`${styles.section} ${styles.profileDetailsSection}`} aria-label="Profile details">
					<div className={styles.profileDetailsFields}>{detailsControls}</div>
				</section>
			)}
			{isMobileDraftEditor(mobileEditor) && (
				<div className={styles.mobileSelectionActions}>
					<button type="button" disabled={disabled} onClick={closeMobileEditor}>Cancel</button>
					<button type="button" disabled={disabled} onClick={confirmMobileEditor}>Use selection</button>
				</div>
			)}
					</div>
				</BottomSheet>
			)}
			{mobileEditor === 'name' && (
				<BottomSheet
					isOpen={nameStyleSubEditor !== null}
					onClose={closeNameStyleSubEditor}
					title={nameStyleSubEditor === 'font' ? 'Choose font' : nameStyleSubEditor === 'effect' ? 'Choose effect' : 'Choose color'}
					initialSnap={1}
					snapPoints={[0, 0.68, 0.9, 1]}
					surface="primary"
					contentClassName={styles.mobileNestedSheetContent}
					containerClassName={`${styles.mobileSheet} ${styles.mobileNameSubSheet}`}
				>
					<div className={styles.mobileNestedSheetBody}>
						<div className={styles.mobileNestedNamePreview}>
							<span className={styles.mobileMemberAvatar}>{avatarUrl ? <img src={avatarUrl} alt="" /> : (displayName || 'N').slice(0, 1).toUpperCase()}</span>
							<span><small>LIVE NAME PREVIEW</small><strong><ProfileDisplayName name={displayName || 'Your name'} appearance={nameEditorAppearance} /></strong></span>
						</div>
						{nameStyleSubEditor === 'font' && <div className={styles.fontGrid} role="group" aria-label="Choose a font">
							{FONT_CHOICES.map((font) => <button
								type="button"
								key={font.value}
								disabled={disabled}
								aria-pressed={nameEditorAppearance.nameFont === font.value}
								className={styles.fontOption}
								data-selected={nameEditorAppearance.nameFont === font.value}
								onClick={() => updateNameStyleDraft({nameFont: font.value, nameStyleEnabled: true})}
							><span style={{fontFamily: font.family}}>Aa</span><small>{font.label}</small></button>)}
						</div>}
						{nameStyleSubEditor === 'effect' && <>
							<div className={styles.categoryTabs} role="group" aria-label="Filter name effects">
								{CATEGORIES.map((category) => <button
									type="button"
									key={category.value}
									disabled={disabled}
									aria-pressed={effectCategory === category.value}
									onClick={() => setEffectCategory(category.value)}
								>{category.label}<span>{EFFECTS.filter((item) => item.category === category.value).length}</span></button>)}
							</div>
							<p className={styles.categoryDescription}>{CATEGORIES.find((item) => item.value === effectCategory)?.description}</p>
							<div className={styles.effectGrid} role="group" aria-label={`${effectCategory} effects`}>
								{visibleEffects.map((item) => {
									const effectColors = getNameEffectSettings(nameEditorAppearance, item.value).colors;
									return <button
										type="button"
										key={item.value}
										disabled={disabled}
										aria-pressed={nameEditorEffect === item.value}
										className={styles.effectOption}
										data-selected={nameEditorEffect === item.value}
										style={{'--effect-start': effectColors[0], '--effect-end': effectColors.at(-1)} as CSSProperties}
										onClick={() => setNameStyleSubDraft(setNameDraftEffect(nameEditorAppearance, item.value))}
									><span className={styles.effectStage}><span>Aa</span><i /></span><span>{item.label}</span></button>;
								})}
							</div>
							<div className={styles.mobileNameEffectSettings}>
								{DIRECTION_EFFECTS.has(nameEditorEffect) && <div className={styles.controlGroup}>
									<span>{nameEditorEffect === 'wave' || nameEditorEffect === 'bounce' ? 'Letter direction' : ['gradient', 'prism', 'aurora'].includes(nameEditorEffect) ? 'Gradient direction' : 'Flow direction'}</span>
									<div className={styles.directionGroup} role="group" aria-label="Effect direction">
										{(['left', 'right', 'up', 'down'] as const).map((direction) => <button
											type="button"
											key={direction}
											disabled={disabled}
											aria-pressed={nameEditorEffectSettings.direction === direction}
											onClick={() => updateNameEffectDraft({direction})}
										>{direction[0]?.toUpperCase()}{direction.slice(1)}</button>)}
									</div>
								</div>}
								{SPEED_EFFECTS.has(nameEditorEffect) && <label className={styles.controlGroup}>
									<span>Speed</span>
									<select className={inputClass} value={nameEditorEffectSettings.speed} disabled={disabled} onChange={(event) => updateNameEffectDraft({speed: event.currentTarget.value as Speed})}>
										<option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option>
									</select>
								</label>}
								{INTENSITY_EFFECTS.has(nameEditorEffect) && <label className={`${styles.controlGroup} ${styles.intensity}`}>
									<span><span>Intensity</span> <b>{nameEditorEffectSettings.intensity}%</b></span>
									<input type="range" min="0" max="100" value={nameEditorEffectSettings.intensity} disabled={disabled} onChange={(event) => updateNameEffectDraft({intensity: Number(event.currentTarget.value)})} />
								</label>}
							</div>
						</>}
						{nameStyleSubEditor === 'color' && <div className={styles.mobileNameColorEditor}>
							<div className={styles.mobilePreviewToolbar}>
								<span>{nameEditorSelectedEffect?.label ?? 'Pure Color'} colors</span>
								<button type="button" disabled={disabled} aria-pressed={nameEditorAppearance.nameColorEnabled !== false} onClick={() => updateNameStyleDraft({nameColorEnabled: nameEditorAppearance.nameColorEnabled === false})}>{nameEditorAppearance.nameColorEnabled === false ? 'Off' : 'On'}</button>
							</div>
							<div className={styles.colorRow}>
								{Array.from({length: nameEditorCount}, (_, index) => <label className={styles.colorInput} key={index}>
									<span>Color {index + 1}</span><code>{(nameEditorColors[index] ?? '#FFFFFF').toUpperCase()}</code>
									<input type="color" value={nameEditorColors[index] ?? '#ffffff'} disabled={disabled} aria-label={`Edit ${nameEditorSelectedEffect?.label ?? 'Pure Color'} color ${index + 1}`} onChange={(event) => setNameColorDraft(nameEditorColors.map((color, colorIndex) => colorIndex === index ? event.currentTarget.value : color))} />
								</label>)}
							</div>
							<div className={styles.paletteRow} role="group" aria-label="Color palettes">
								{PALETTES.map((palette, index) => {
									const nextColors = paletteForEffect(palette, nameEditorCount);
									const selected = nextColors.every((color, colorIndex) => nameEditorColors[colorIndex]?.toLowerCase() === color.toLowerCase());
									return <button type="button" key={index} disabled={disabled} aria-label={`Apply palette ${index + 1}`} aria-pressed={selected} className={styles.palette} style={{background: `linear-gradient(90deg, ${nextColors.join(',')})`}} onClick={() => setNameColorDraft(nextColors)} />;
								})}
							</div>
						</div>}
						<div className={styles.mobileNestedActions}>
							<button type="button" disabled={disabled} onClick={closeNameStyleSubEditor}>Cancel</button>
							<button type="button" disabled={disabled} onClick={confirmNameStyleSubEditor}>Use selection</button>
						</div>
					</div>
				</BottomSheet>
			)}
		</>
	);

	return (
		<div
			id="profile-customization-studio"
			className={styles.studio}
			aria-disabled={disabled || undefined}
			data-mobile-flow={mobilePreview ? 'true' : undefined}
			data-mobile-editor={mobileEditor}
			style={
				{
					'--profile-background-primary': value.appearance.profileBackgroundPrimary,
					'--profile-background-secondary': value.appearance.profileBackgroundSecondary,
'--studio-card-width': `${PROFILE_POPOUT_GEOMETRY.contentWidthPx}px`,
				} as CSSProperties
			}
		>
			{mobilePreview ? (
				<div className={styles.mobileProfileSurface} data-profile-scope={profileScopeLabel}>
					<div className={styles.mobilePreview}>
						{cloneElement(mobilePreview, {
							editorControls: (
								<section
									className={`${styles.studio} ${styles.embeddedControls} ${styles.mobileEditingSection}`}
									data-mobile-flow="true"
									data-mobile-editor={mobileEditor}
									aria-label="Edit profile"
								>
									{mobileNotice}
									{studioControls}
								</section>
							),
						})}
					</div>
				</div>
			) : (
				<div className={styles.desktopSurface}>
					<DesktopProfileEditor
						value={value}
						onChange={onChange}
						disabled={disabled}
						displayName={displayName ?? ''}
						canEditDisplayName={canEditDisplayName}
						avatarUrl={avatarUrl}
						bannerUrl={bannerUrl}
						desktopPreview={desktopPreview}
						renderDesktopPreview={renderDesktopPreview}
						themeColorControls={themeColorControls}
						desktopAvatarControls={desktopAvatarControls}
						desktopCoverControls={desktopCoverControls}
						desktopDetailsControls={desktopDetailsControls}
						desktopNameplateControls={desktopNameplateControls}
						renderDesktopNameplateControls={renderDesktopNameplateControls}
						profileScopeLabel={profileScopeLabel}
						onDisplayNameChange={onDisplayNameChange}
						pending={pending}
						onDialogBegin={onDialogBegin}
						onDialogCommit={onDialogCommit}
						onDialogCancel={onDialogCancel}
						onBack={onBack}
					/>
				</div>
			)}
		</div>
	);
}
