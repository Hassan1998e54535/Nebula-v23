// SPDX-License-Identifier: Nebula

import {
	AvatarDecorationMedia,
	NameplateMedia,
	ProfileEffectMedia,
	ProfileFrameMedia,
} from '@app/features/user/components/profile/media/ProfileMedia';
import {
	DECORATIONS,
	FRAMES,
	NAMEPLATES,
	PROFILE_EFFECTS,
} from '@app/features/user/components/profile/media/profileMediaCatalog';
import {ProfileDisplayName} from '@app/features/user/components/profile/media/ProfileDisplayName';
import {getNameEffectSettings} from '@app/features/user/components/profile/studio/nameStyleColors';
import type {ProfileAppearance, ProfileCustomization} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import OverlayStack from '@app/features/ui/state/OverlayStack';
import {
	ArrowCounterClockwiseIcon,
	ArrowRightIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CheckIcon,
	ImageIcon,
	IdentificationCardIcon,
	MagnifyingGlassIcon,
	PaintBrushIcon,
	PencilSimpleIcon,
	SparkleIcon,
	StarIcon,
	UserCircleIcon,
	XIcon,
} from '@phosphor-icons/react';
import {cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './DesktopProfileEditor.module.css';
import {clsx} from 'clsx';

type Tool = 'nameplate' | 'avatar' | 'decoration' | 'name' | 'colors' | 'cover' | 'profile-effects' | 'frame' | 'details';
type DesktopControls = ReactElement<{autoOpen?: boolean; onAutoOpen?: () => void}>;
type NameCategory = 'color' | 'light' | 'motion';
type NameEffect = ProfileAppearance['nameEffect'];
type ThemeAppearanceColors = Pick<ProfileAppearance, 'profileBackgroundPrimary' | 'profileBackgroundSecondary'>;

interface Props {
	value: ProfileCustomization;
	onChange: (value: ProfileCustomization) => void;
	disabled: boolean;
	displayName: string;
	canEditDisplayName?: boolean;
	avatarUrl?: string | null;
	bannerUrl?: string | null;
	desktopPreview?: ReactElement;
	renderDesktopPreview?: (value: ProfileCustomization) => ReactNode;
	themeColorControls?: ReactNode;
	desktopAvatarControls?: DesktopControls;
	desktopCoverControls?: DesktopControls;
	desktopDetailsControls?: ReactNode;
	desktopNameplateControls?: ReactNode;
	renderDesktopNameplateControls?: (
		settings: ProfileCustomization['nameplateSettings'],
		onChange: (settings: Partial<ProfileCustomization['nameplateSettings']>) => void,
	) => ReactNode;
	profileScopeLabel: string;
	onDisplayNameChange?: (name: string) => void;
	pending?: boolean;
	onDialogBegin?: (tool: Tool, value: ProfileCustomization) => void;
	onDialogCommit?: (tool: Tool, value: ProfileCustomization) => void;
	onDialogCancel?: (tool: Tool) => void;
	onBack?: () => void;
}

const FONT_CHOICES: ReadonlyArray<{value: string; label: string}> = [
	{value: 'nexus', label: 'NEXUS Sans'},
	{value: 'editorial', label: 'Editorial'},
	{value: 'terminal', label: 'Terminal'},
	{value: 'rounded', label: 'Rounded'},
	{value: 'display', label: 'Display'},
	{value: 'classic', label: 'Classic'},
	{value: 'wide', label: 'Wide'},
	{value: 'stencil', label: 'Stencil'},
	{value: 'typewriter', label: 'Typewriter'},
	{value: 'humanist', label: 'Humanist'},
	{value: 'compact', label: 'Compact'},
	{value: 'refined', label: 'Refined'},
	{value: 'handwritten', label: 'Handwritten'},
	{value: 'geometric', label: 'Geometric'},
];

const NAME_EFFECTS: ReadonlyArray<{value: NameEffect; label: string; category: NameCategory}> = [
	{value: 'solid', label: 'Pure Color', category: 'color'}, {value: 'gradient', label: 'Silk Gradient', category: 'color'},
	{value: 'prism', label: 'Prism', category: 'color'}, {value: 'spectrum', label: 'Letter Spectrum', category: 'color'},
	{value: 'neon', label: 'Halo', category: 'light'}, {value: 'outline', label: 'Contour', category: 'light'},
	{value: 'shimmer', label: 'Glimmer', category: 'light'}, {value: 'aurora', label: 'Aurora', category: 'light'},
	{value: 'echo', label: 'Afterglow', category: 'light'}, {value: 'glass', label: 'Glasslight', category: 'light'},
	{value: 'ember', label: 'Ember', category: 'light'}, {value: 'frost', label: 'Frost', category: 'light'},
	{value: 'flow', label: 'Color Current', category: 'motion'}, {value: 'pulse', label: 'Heartbeat', category: 'motion'},
	{value: 'wave', label: 'Letter Wave', category: 'motion'}, {value: 'bounce', label: 'Letter Lift', category: 'motion'},
	{value: 'flicker', label: 'Spark', category: 'motion'}, {value: 'comet', label: 'Comet Trail', category: 'motion'},
	{value: 'ripple', label: 'Radiant Ripple', category: 'motion'}, {value: 'orbit', label: 'Color Orbit', category: 'motion'},
];
const PALETTES = [
	['#48E6D0', '#7B8CFF', '#E4A8FF', '#F06CA8', '#F7D56A'], ['#FF9C68', '#F06CA8', '#E4A8FF', '#7A71F5', '#34C4D8'],
	['#93E46D', '#34C4D8', '#48E6D0', '#7B8CFF', '#E4A8FF'], ['#F7D56A', '#F08068', '#F06CA8', '#B65CF0', '#7A71F5'],
	['#E7ECF4', '#8CA7C9', '#7B8CFF', '#48E6D0', '#93E46D'], ['#F08068', '#F7D56A', '#93E46D', '#34C4D8', '#7A71F5'],
	['#7B8CFF', '#E4A8FF', '#F06CA8', '#F7D56A', '#48E6D0'], ['#F06CA8', '#E4A8FF', '#7A71F5', '#34C4D8', '#FF9C68'],
];

const CARD_COLOR_PRESETS: ReadonlyArray<{primary: string; secondary: string; gradient: string}> = [
	{primary: '#a855f7', secondary: '#ec4899', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)'},
	{primary: '#f59e0b', secondary: '#ef4444', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)'},
	{primary: '#06b6d4', secondary: '#10b981', gradient: 'linear-gradient(135deg, #06b6d4, #10b981)'},
	{primary: '#38bdf8', secondary: '#818cf8', gradient: 'linear-gradient(135deg, #38bdf8, #818cf8)'},
	{primary: '#6366f1', secondary: '#a855f7', gradient: 'linear-gradient(135deg, #6366f1, #a855f7)'},
	{primary: '#334155', secondary: '#1e293b', gradient: 'linear-gradient(135deg, #334155, #1e293b)'},
];

const titles: Record<Tool, string> = {
	nameplate: 'Nameplate', avatar: 'Profile picture', decoration: 'Avatar decoration',
	name: 'Display name style', colors: 'Card atmosphere', cover: 'Cover image',
	'profile-effects': 'Profile effect', frame: 'Profile frame', details: 'Profile details',
};
const titleCase = (text: string) => text.replace(/(^|-)\w/g, (part) => part.toUpperCase()).replaceAll('-', ' ');

function getEffectBadge(effect: {id: string; type?: string}) {
	if (effect.id === 'none') return 'CLEAN';
	if (effect.type === 'webm') return 'WEBM';
	if (effect.type === 'rive') return 'RIVE';
	return 'APNG';
}

function getEffectSubtitle(effect: {id: string; duration?: number; loop?: boolean}) {
	if (effect.id === 'none') return 'No opening animation';
	if (effect.id === 'nexus-pulse') return '2.8 sec';
	if (effect.id === 'a-sassy-crocodile') return '6.0 sec';
	if ('duration' in effect && effect.duration && !effect.loop) {
		return `${(effect.duration / 1000).toFixed(1)} sec`;
	}
	return 'Continuous';
}

function cloneValue(value: ProfileCustomization): ProfileCustomization {
	return {
		...value,
		appearance: {...value.appearance, nameEffects: value.appearance.nameEffects ? {...value.appearance.nameEffects} : undefined},
		nameplateSettings: {...value.nameplateSettings, nameplateUploads: [...(value.nameplateSettings.nameplateUploads ?? [])]},
	};
}

export function DesktopProfileEditor(props: Props) {
	const [tool, setTool] = useState<Tool | null>(null);
	const [draft, setDraft] = useState<ProfileCustomization | null>(null);
	const [category, setCategory] = useState<NameCategory>('color');
	const [nameDraft, setNameDraft] = useState(props.displayName);
	const [nameplateSearch, setNameplateSearch] = useState('');
	const [replayKey, setReplayKey] = useState(0);
	const closeRef = useRef<HTMLButtonElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const dialogRef = useRef<HTMLElement>(null);
	const [dialogZIndex, setDialogZIndex] = useState<number>(10005);

	useEffect(() => {
		if (tool && tool !== 'avatar' && tool !== 'cover') {
			const z = OverlayStack.acquire();
			setDialogZIndex(z);
			return () => OverlayStack.release(z);
		}
	}, [tool]);

	const open = (nextTool: Tool, opener: HTMLElement) => {
		if (props.disabled || props.pending) return;
		openerRef.current = opener;
		const next = cloneValue(props.value);
		setNameDraft(props.displayName);
		if (nextTool === 'name') setCategory(NAME_EFFECTS.find((item) => item.value === next.appearance.nameEffect)?.category ?? 'color');
		if (nextTool === 'name' || nextTool === 'profile-effects' || nextTool === 'frame') {
			setReplayKey((key) => key + 1);
		}
		setDraft(next);
		setTool(nextTool);
		if (nextTool !== 'avatar' && nextTool !== 'cover') props.onDialogBegin?.(nextTool, next);
	};
	const cancel = useCallback(() => {
		if (!tool) return;
		if (tool !== 'avatar' && tool !== 'cover') props.onDialogCancel?.(tool);
		setTool(null);
		setDraft(null);
	}, [tool, props.onDialogCancel]);
const cancelRef = useRef(cancel);
cancelRef.current = cancel;
	const dismissForManagedPicker = () => {
		// The host upload/crop dialog owns its own accept/cancel lifecycle.
		// Dismissing this shell must not discard that active managed flow.
		openerRef.current = null;
		setTool(null);
		setDraft(null);
	};
	const apply = () => {
		if (!tool || !draft || props.pending) return;
		props.onChange(draft);
		if (tool === 'name' && props.canEditDisplayName !== false) props.onDisplayNameChange?.(nameDraft);
		props.onDialogCommit?.(tool, draft);
		setTool(null);
		setDraft(null);
	};
	const updateAppearance = (patch: Partial<ProfileAppearance>) => setDraft((current) =>
		current ? {...current, appearance: {...current.appearance, ...patch}} : current);
	const updateDraft = (patch: Partial<ProfileCustomization>) => setDraft((current) => current ? {...current, ...patch} : current);
	const updateNameplate = (patch: Partial<ProfileCustomization['nameplateSettings']>) => setDraft((current) =>
		current ? {...current, nameplateSettings: {...current.nameplateSettings, ...patch}} : current);

	useEffect(() => {
		if (!tool) return;
		closeRef.current?.focus();
		const onKey = (event: KeyboardEvent) => {
if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); cancelRef.current(); }
			if (event.key !== 'Tab' || !dialogRef.current) return;
			const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'));
			if (!items.length) return;
			if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
			else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
		};
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
			openerRef.current?.focus();
			openerRef.current = null;
		};
}, [tool]);

	const appearance = draft?.appearance ?? props.value.appearance;
	const preview = draft && props.renderDesktopPreview ? props.renderDesktopPreview(draft) : props.desktopPreview;
	const selectedPlate = NAMEPLATES.find((item) => item.id === (draft?.nameplateSettings.nameplate ?? props.value.nameplateSettings.nameplate));
	const decoration = DECORATIONS.find((item) => item.id === appearance.avatarDecoration);
	const effectId = draft ? draft.profileEffectId : props.value.profileEffectId;
	const effect = PROFILE_EFFECTS.find((item) => item.id === effectId);
	const frame = FRAMES.find((item) => item.id === appearance.cardFrame);
	const handleBack = () => {
		if (props.onBack) {
			props.onBack();
		} else {
			ModalCommands.popWithKey('user-settings');
		}
	};

	const memberRow = (settings: ProfileCustomization['nameplateSettings']) => (
		<div className={styles.memberRowPreview}>
{settings.nameplate !== 'none' && <NameplateMedia settings={settings} />}
			<div className={styles.memberAvatar}>{props.avatarUrl ? <img src={props.avatarUrl} alt=""/> : (nameDraft || 'N').slice(0, 1).toUpperCase()}</div>
			<div className={styles.memberIdentity}>
				<strong><ProfileDisplayName name={nameDraft || 'Your name'} appearance={appearance}/></strong><span>@member</span>
			</div>
			<span className={styles.onlineDot} aria-hidden="true"/>
		</div>
	);

	const renderNameplateCard = (
		settings: ProfileCustomization['nameplateSettings'],
		label?: string,
		isSelected?: boolean,
		onClick?: () => void,
		key?: string,
	) => {
		const avatarUrl = props.avatarUrl || '/assets/profile-media/hasoon-avatar.png';
		const name = nameDraft || props.displayName || 'HASOON';
		return (
			<button
				key={key ?? label ?? settings.nameplate}
				type="button"
				className={styles.nameplateBannerCard}
				data-selected={isSelected}
				aria-pressed={isSelected}
				onClick={onClick}
				aria-label={label ?? 'Nameplate preview'}
			>
				{settings.nameplate !== 'none' ? (
<NameplateMedia settings={settings} />
				) : (
					<div className={styles.noNameplateBanner} />
				)}
				<div className={styles.nameplateCardOverlay}>
					<div className={styles.nameplateAvatarCircle}>
						<img src={avatarUrl} alt="" />
					</div>
					<span className={styles.nameplateIdentityText}>
						<ProfileDisplayName
							name={name}
							appearance={appearance}
						/>
					</span>
				</div>
			</button>
		);
	};

	const controls = () => {
		if (!draft || !tool) return null;
		const a = draft.appearance;
		if (tool === 'nameplate') {
			const query = nameplateSearch.trim().toLowerCase();
			const filteredPlates = NAMEPLATES.filter((item) =>
				`${item.label} ${item.description ?? ''} ${item.id}`.toLowerCase().includes(query),
			);
			const customUploads = (draft.nameplateSettings.nameplateUploads ?? []).filter((item) =>
				item.filename.toLowerCase().includes(query),
			);
			return (
				<div className={styles.nameplateDialogBody}>
					<div className={styles.nameplateSearchWrapper}>
						<MagnifyingGlassIcon size={16} className={styles.nameplateSearchIcon} />
						<input
							type="text"
							value={nameplateSearch}
							onChange={(event) => setNameplateSearch(event.currentTarget.value)}
							placeholder="Search nameplates…"
							aria-label="Search nameplates"
							className={styles.nameplateSearchInput}
						/>
					</div>

					<div className={styles.nameplateCardsScroll}>
						{filteredPlates.map((item) => {
							const isSelected = draft.nameplateSettings.nameplate === item.id;
							return renderNameplateCard(
								{...draft.nameplateSettings, nameplate: item.id, nameplateImage: null, nameplateCrop: null},
								item.label,
								isSelected,
								() => updateNameplate({nameplate: item.id, nameplateImage: null, nameplateCrop: null}),
								item.id,
							);
						})}
						{customUploads.map((item) => {
							const isSelected =
								draft.nameplateSettings.nameplate === 'custom' &&
								draft.nameplateSettings.nameplateImage === item.filename;
							return renderNameplateCard(
								{...draft.nameplateSettings, nameplate: 'custom', nameplateImage: item.filename, nameplateCrop: null},
								item.filename,
								isSelected,
								() => updateNameplate({nameplate: 'custom', nameplateImage: item.filename, nameplateCrop: null}),
								`custom-${item.filename}`,
							);
						})}
						{(!query || 'no nameplate none'.includes(query)) && (
							renderNameplateCard(
								{...draft.nameplateSettings, nameplate: 'none', nameplateImage: null, nameplateCrop: null},
								'No nameplate',
								draft.nameplateSettings.nameplate === 'none',
								() => updateNameplate({nameplate: 'none', nameplateImage: null, nameplateCrop: null}),
								'none',
							)
						)}
					</div>
				</div>
			);
		}
		if (tool === 'name') {
			const colors = a.nameEffects?.[a.nameEffect]?.colors ?? [a.nameColorStart, a.nameColorEnd];
			return <div className={styles.dialogBody}>
				<label className={styles.textField}><span>Display name</span><input maxLength={32} value={nameDraft} disabled={props.canEditDisplayName === false} onChange={(event) => setNameDraft(event.currentTarget.value)} aria-label="Display name"/></label>
				<p className={styles.sectionCaption}>Font · 14 styles</p>
				<div className={styles.fontGrid}>{FONT_CHOICES.map((font) => {
					const fontAppearance: ProfileAppearance = {...a, nameStyleEnabled: true, nameFont: font.value};
					return <button key={font.value} type="button" disabled={props.disabled} aria-pressed={a.nameFont === font.value} data-selected={a.nameFont === font.value} onClick={() => updateAppearance({nameFont: font.value, nameStyleEnabled: true})} className={styles.fontChoice}><strong><ProfileDisplayName name={nameDraft || 'Aa'} appearance={fontAppearance}/></strong><small>{font.label}</small></button>;
				})}</div>
				<div className={styles.sectionHeader}><h4>Choose a finish</h4><span>20 styles</span></div>
				<div className={styles.tabs}>{(['color', 'light', 'motion'] as const).map((item) => <button key={item} type="button" data-selected={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
				<div className={styles.effectGrid}>{NAME_EFFECTS.filter((item) => item.category === category).map((item) => {
					const sampleSettings = getNameEffectSettings(a, item.value);
					const sampleAppearance: ProfileAppearance = {
						...a,
						nameStyleEnabled: true,
						nameColorEnabled: true,
						nameEffect: item.value,
						nameAnimation: 'off',
						nameEffects: {...a.nameEffects, [item.value]: sampleSettings},
					};
					return <button key={item.value} type="button" data-selected={a.nameEffect === item.value} aria-pressed={a.nameEffect === item.value} onClick={() => updateAppearance({nameEffect: item.value, nameStyleEnabled: true})} className={styles.effectChoice}><strong><ProfileDisplayName name={nameDraft || 'Aa'} appearance={sampleAppearance}/></strong><small>{item.label}</small></button>;
				})}</div>
				<div className={styles.sectionHeader}><h4>Color and motion</h4><label><input type="checkbox" checked={a.nameColorEnabled !== false} onChange={(event) => updateAppearance({nameColorEnabled: event.currentTarget.checked})}/><span>Color</span></label></div>
				<div className={styles.colorInputs}>{Array.from({length: Math.max(1, colors.length)}, (_, index) => <label key={index}><span>Color {index + 1}</span><input type="color" value={colors[index] ?? a.nameColorStart} onChange={(event) => updateAppearance({nameEffects: {...a.nameEffects, [a.nameEffect]: {...a.nameEffects?.[a.nameEffect], colors: colors.map((color, i) => i === index ? event.currentTarget.value : color)}}})}/></label>)}</div>
				<div className={styles.paletteRow}>{PALETTES.map((palette, index) => <button key={index} aria-label={`Color palette ${index + 1}`} type="button" style={{background: `linear-gradient(90deg,${palette.join(',')})`}} onClick={() => updateAppearance({nameColorStart: palette[0]!, nameColorEnd: palette[palette.length - 1]!, nameEffects: {...a.nameEffects, [a.nameEffect]: {...a.nameEffects?.[a.nameEffect], colors: palette.slice(0, Math.max(2, colors.length))}}})}/>)}</div>
				<p className={styles.contextNote}>Name appearance is shown wherever your name appears.</p>
			</div>;
		}
		if (tool === 'decoration') {
			const options = [
				{id: 'none', label: 'None'},
				...(DECORATIONS.filter((item) => item.id !== 'none')),
				...(a.avatarDecoration !== 'none' && !DECORATIONS.some((item) => item.id === a.avatarDecoration)
					? [{id: a.avatarDecoration, label: 'Selected decoration'}]
					: []),
			];
			return (
				<div className={styles.dialogBody}>
					<div className={styles.sectionHeader}>
						<span className={styles.decorationCategoryCaption}>
							ANIMATED DECORATIONS · {options.length > 1 ? options.length - 1 : 0}
						</span>
					</div>
					<div className={styles.decorationGrid}>
						{options.map((item) => {
							const isSelected = a.avatarDecoration === item.id;
							return (
								<button
									key={item.id}
									type="button"
									data-selected={isSelected}
									aria-pressed={isSelected}
									onClick={() => updateAppearance({avatarDecoration: item.id})}
									className={styles.decorationCardBtn}
								>
									<div className={styles.decorationAvatarWrapper}>
										<div
											className={clsx(
												styles.decorationAvatarCircle,
												item.id === 'none' && styles.noneAvatarGrayscale,
											)}
										>
											{props.avatarUrl ? (
												<img src={props.avatarUrl} alt="" />
											) : (
												<span>{(nameDraft || props.displayName || 'H').slice(0, 1).toUpperCase()}</span>
											)}
										</div>
										{item.id !== 'none' && (
											<div className={styles.decorationOverlayLayer}>
												<AvatarDecorationMedia decoration={item.id} size={50} />
											</div>
										)}
									</div>
									<b className={styles.decorationItemLabel}>{item.label}</b>
								</button>
							);
						})}
					</div>
				</div>
			);
		}
		if (tool === 'profile-effects') {
			const activeId = draft.profileEffectId ?? 'none';
			const effects = [
				{id: 'none', name: 'None', type: 'clean', description: 'No opening animation'},
				...PROFILE_EFFECTS,
			];
			return (
				<div className={styles.effectsDialogBody}>
					<div className={styles.effectsSectionHeader}>
						<div>
							<h3 className={styles.effectsSectionTitle}>Choose a moment</h3>
							<p className={styles.effectsSectionSubtitle}>
								Starts when a profile opens; loops continue while it stays open.
							</p>
						</div>
						<span className={styles.effectsAvailableCount}>
							{PROFILE_EFFECTS.length} AVAILABLE
						</span>
					</div>

					<div className={styles.effectsCardsGrid}>
						{effects.map((item) => {
							const isSelected = activeId === item.id;
							const badge = getEffectBadge(item);
							const subtitle = getEffectSubtitle(item);
							return (
								<button
									key={item.id}
									type="button"
									className={styles.effectItemCard}
									data-selected={isSelected}
									aria-pressed={isSelected}
									onClick={() => {
										updateDraft({profileEffectId: item.id === 'none' ? null : item.id});
										setReplayKey((k) => k + 1);
									}}
								>
									<span className={styles.effectBadgePill}>{badge}</span>
									{isSelected && (
										<span className={styles.effectSelectedCheckmark}>
											<CheckIcon size={12} weight="bold" />
										</span>
									)}
									<div className={styles.effectThumbnailArea}>
										{item.id === 'none' ? (
											<div className={styles.cleanEffectThumbnail} />
										) : 'thumbnail' in item && item.thumbnail ? (
											<img src={item.thumbnail} alt="" loading="lazy" />
										) : (
											<ProfileEffectMedia effectId={item.id} />
										)}
									</div>
									<div className={styles.effectItemLabels}>
										<b className={styles.effectItemName}>{item.name}</b>
										<small className={styles.effectItemSubtitle}>{subtitle}</small>
									</div>
								</button>
							);
						})}
					</div>
				</div>
			);
		}
		if (tool === 'frame') {
			const frames = [
				{id: 'none', name: 'No Frame', description: 'Use the profile without a frame.'},
				...FRAMES.filter((item) => item.id !== 'none'),
				...(a.cardFrame !== 'none' && !FRAMES.some((item) => item.id === a.cardFrame)
					? [{id: a.cardFrame, name: 'Selected frame', description: 'Currently selected frame.'}]
					: []),
			];
			return <div className={styles.dialogBody}>
				<div className={styles.frameGrid}>{frames.map((item) => <button key={item.id} type="button" data-selected={a.cardFrame === item.id} aria-pressed={a.cardFrame === item.id} onClick={() => {updateAppearance({cardFrame: item.id}); setReplayKey((key) => key + 1);}} className={styles.frameChoice}><span className={styles.frameThumb}>{item.id !== 'none' && <ProfileFrameMedia frame={item.id} size={144}/>}<span>{nameDraft || 'Your name'}</span></span><b>{item.name}</b>{item.description && <small>{item.description}</small>}</button>)}</div>
			</div>;
		}
		if (tool === 'colors') {
			const topColor = (a.profileBackgroundPrimary ?? '#f59e0b').toUpperCase();
			const bottomColor = (a.profileBackgroundSecondary ?? '#ef4444').toUpperCase();
			const swapColors = () => {
				updateAppearance({
					profileBackgroundPrimary: bottomColor,
					profileBackgroundSecondary: topColor,
				});
			};
			return (
				<div className={styles.dialogBody}>
					{/* CARD COLORS */}
					<div className={styles.sectionHeaderRow}>
						<span className={styles.dialogSectionTitle}>CARD COLORS</span>
						<span className={styles.dialogSectionSubtitle}>Smooth vertical gradient</span>
					</div>

					<div className={styles.cardColorPickersGrid}>
						<div className={styles.cardColorField}>
							<span className={styles.cardColorFieldLabel}>Top color</span>
							<label className={styles.cardColorInputWrapper}>
								<span
									className={styles.cardColorSwatch}
									style={{background: topColor}}
								/>
								<span className={styles.cardColorHex}>{topColor}</span>
								<input
									type="color"
									value={topColor}
									onChange={(e) => updateAppearance({profileBackgroundPrimary: e.currentTarget.value})}
									className={styles.hiddenColorInput}
									aria-label="Top color"
								/>
							</label>
						</div>

						<div className={styles.cardColorField}>
							<span className={styles.cardColorFieldLabel}>Bottom color</span>
							<label className={styles.cardColorInputWrapper}>
								<span
									className={styles.cardColorSwatch}
									style={{background: bottomColor}}
								/>
								<span className={styles.cardColorHex}>{bottomColor}</span>
								<input
									type="color"
									value={bottomColor}
									onChange={(e) => updateAppearance({profileBackgroundSecondary: e.currentTarget.value})}
									className={styles.hiddenColorInput}
									aria-label="Bottom color"
								/>
							</label>
						</div>
					</div>

					{/* PRESETS */}
					<div className={styles.sectionHeaderRow} style={{marginTop: '0.45rem'}}>
						<span className={styles.dialogSectionTitle}>PRESETS</span>
					</div>

					<div className={styles.presetsGrid}>
						{CARD_COLOR_PRESETS.map((preset, idx) => (
							<button
								key={idx}
								type="button"
								className={styles.presetGradientBtn}
								style={{background: preset.gradient}}
								onClick={() => updateAppearance({
									profileBackgroundPrimary: preset.primary,
									profileBackgroundSecondary: preset.secondary,
								})}
								aria-label={`Preset ${idx + 1}`}
							/>
						))}
					</div>

					<button
						type="button"
						className={styles.swapColorsBtn}
						onClick={swapColors}
					>
						Swap top and bottom
					</button>

					{/* DIVIDER COLOR */}
					<div className={styles.sectionHeaderRow} style={{marginTop: '0.65rem'}}>
						<span className={styles.dialogSectionTitle}>DIVIDER COLOR</span>
					</div>

					<div className={styles.togglePillsRow}>
						<button
							type="button"
							className={styles.togglePillBtn}
							data-selected={a.dividerMode !== 'custom'}
							aria-pressed={a.dividerMode !== 'custom'}
							onClick={() => updateAppearance({dividerMode: 'default'})}
						>
							Auto Contrast
						</button>
						<button
							type="button"
							className={styles.togglePillBtn}
							data-selected={a.dividerMode === 'custom'}
							aria-pressed={a.dividerMode === 'custom'}
							onClick={() => updateAppearance({dividerMode: 'custom'})}
						>
							Custom Color
						</button>
					</div>

					<p className={styles.dialogHelperNote}>
						Auto Contrast reverses the card gradient along the curve.
					</p>

					{a.dividerMode === 'custom' && (
						<label className={styles.cardColorInputWrapper} style={{marginTop: '0.4rem'}}>
							<span
								className={styles.cardColorSwatch}
								style={{background: a.dividerCustomColor ?? '#48e6d0'}}
							/>
							<span className={styles.cardColorHex}>{(a.dividerCustomColor ?? '#48e6d0').toUpperCase()}</span>
							<input
								type="color"
								value={a.dividerCustomColor ?? '#48e6d0'}
								onChange={(e) => updateAppearance({dividerCustomColor: e.currentTarget.value})}
								className={styles.hiddenColorInput}
								aria-label="Custom divider color"
							/>
						</label>
					)}

					{/* CARD ATMOSPHERE */}
					<div className={styles.sectionHeaderRow} style={{marginTop: '0.65rem'}}>
						<span className={styles.dialogSectionTitle}>CARD ATMOSPHERE</span>
					</div>

					<div className={styles.atmospherePillsRow}>
						{(['none', 'aurora', 'particles', 'scan'] as const).map((effect) => (
							<button
								key={effect}
								type="button"
								className={styles.togglePillBtn}
								data-selected={(a.cardEffect ?? 'none') === effect}
								aria-pressed={(a.cardEffect ?? 'none') === effect}
								onClick={() => updateAppearance({cardEffect: effect})}
							>
								{titleCase(effect)}
							</button>
						))}
					</div>
				</div>
			);
		}
		if (tool === 'details') return <div className={styles.dialogBody}>{props.desktopDetailsControls}</div>;
		return <div className={styles.dialogBody}><p className={styles.contextNote}>Use the existing profile image controls to select and crop your image.</p></div>;
	};

	const mainPreview = props.renderDesktopPreview ? props.renderDesktopPreview(props.value) : props.desktopPreview;

	return <div className={styles.editor}>
		<aside className={styles.rail} aria-label="Profile tools">
			<div className={styles.toolScroll}>
				{/* 1 Nameplate */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<span className={styles.numBadge}>1</span>
						<span className={styles.sectionTitle}>Nameplate</span>
					</div>
					<button
						type="button"
						className={styles.nameplateCard}
						onClick={(event) => open('nameplate', event.currentTarget)}
						disabled={props.disabled || props.pending}
						aria-label={`Nameplate: ${selectedPlate?.label ?? 'Choose a nameplate'}`}
					>
						{(draft?.nameplateSettings.nameplate ?? props.value.nameplateSettings.nameplate) !== 'none' ? (
							<>
								{selectedPlate?.thumbnail || selectedPlate?.fallback ? (
									<img src={selectedPlate.thumbnail ?? selectedPlate.fallback} alt="" className={styles.nameplateThumbImg} />
								) : (
									<NameplateMedia settings={draft?.nameplateSettings ?? props.value.nameplateSettings} />
								)}
								<div className={styles.nameplateCardContent}>
									<span className={styles.nameplateCardLabel}>
										{selectedPlate?.label ?? 'Nameplate'}
									</span>
								</div>
							</>
						) : (
							<div className={styles.nameplateCardEmpty}>
								<span className={styles.nameplateEmptyBadge}>None</span>
								<span className={styles.nameplateEmptyHint}>Choose a nameplate</span>
							</div>
						)}
						<span className={styles.nameplateCardActionIcon}>
							<PencilSimpleIcon size={14} weight="bold" />
						</span>
					</button>
				</section>

				{/* 2 Portrait */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<span className={styles.numBadge}>2</span>
						<span className={styles.sectionTitle}>Portrait</span>
					</div>
					<div className={styles.twoColumnGrid}>
						<button
							type="button"
							className={styles.gridCard}
							onClick={(event) => open('avatar', event.currentTarget)}
							disabled={props.disabled || props.pending || !props.desktopAvatarControls}
							aria-label="Avatar: Custom profile image"
						>
							<span className={styles.cardActionIconTopRight}>
								<PencilSimpleIcon size={13} weight="bold" />
							</span>
							<div className={styles.avatarCardContent}>
								<span className={styles.avatarCircleThumb}>
									{props.avatarUrl ? <img src={props.avatarUrl} alt="" /> : (props.displayName || 'N').slice(0, 1).toUpperCase()}
								</span>
								<div className={styles.cardBottomLabels}>
									<b>Avatar</b>
									<small>{props.avatarUrl ? 'Custom profile image' : 'Profile picture'}</small>
								</div>
							</div>
						</button>
						<button
							type="button"
							className={styles.gridCard}
							onClick={(event) => open('decoration', event.currentTarget)}
							disabled={props.disabled || props.pending}
							aria-label={`Decoration: ${decoration?.label ?? 'Choose a decoration'}`}
						>
							<span className={styles.cardActionIconTopRight}>
								<PencilSimpleIcon size={13} weight="bold" />
							</span>
							<div className={styles.decorationCardContent}>
								<div className={styles.decorationCircleThumb}>
									<span>{props.avatarUrl ? <img src={props.avatarUrl} alt="" /> : (props.displayName || 'N').slice(0, 1)}</span>
									{appearance.avatarDecoration !== 'none' && (
										<AvatarDecorationMedia decoration={appearance.avatarDecoration} size={54} />
									)}
								</div>
								<div className={styles.cardBottomLabels}>
									<b>Decoration</b>
									<small>{decoration?.label ?? 'Choose a decoration'}</small>
								</div>
							</div>
						</button>
					</div>
				</section>

				{/* 3 Name appearance */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<span className={styles.numBadge}>3</span>
						<span className={styles.sectionTitle}>Name appearance</span>
					</div>
					<button
						type="button"
						className={styles.nameAppearanceCard}
						onClick={(event) => open('name', event.currentTarget)}
						disabled={props.disabled || props.pending}
						aria-label="Display name style"
					>
						<div className={styles.nameDisplayWrapper}>
							<ProfileDisplayName name={nameDraft || props.displayName || 'Your name'} appearance={appearance} />
						</div>
						<span className={styles.cardActionIconChevron}>
							<CaretRightIcon size={15} weight="bold" />
						</span>
					</button>
				</section>

				{/* 4 Card atmosphere */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<span className={styles.numBadge}>4</span>
						<span className={styles.sectionTitle}>Card atmosphere</span>
					</div>
					<div className={styles.twoColumnGrid}>
						<button
							type="button"
							className={styles.gridCard}
							onClick={(event) => open('colors', event.currentTarget)}
							disabled={props.disabled || props.pending}
							aria-label="Theme colors: Card colors and atmosphere"
						>
							<span className={styles.cardActionIconTopRight}>
								<PencilSimpleIcon size={13} weight="bold" />
							</span>
							<div className={styles.colorsCardContent} style={{background: `linear-gradient(135deg, ${appearance.profileBackgroundPrimary ?? '#324348'}, ${appearance.profileBackgroundSecondary ?? '#172124'})`}}>
								<div className={styles.colorIndicatorDots}>
									<div className={styles.colorIndicatorRow}>
										<span>Top</span>
										<span className={styles.colorDot} style={{background: appearance.profileBackgroundPrimary ?? '#324348'}} />
									</div>
									<div className={styles.colorIndicatorRow}>
										<span>Bottom</span>
										<span className={styles.colorDot} style={{background: appearance.profileBackgroundSecondary ?? '#172124'}} />
									</div>
								</div>
								<div className={styles.cardBottomLabels}>
									<b>Card atmosphere</b>
									<small>Card colors and atmosphere</small>
								</div>
							</div>
						</button>
						<button
							type="button"
							className={styles.gridCard}
							onClick={(event) => open('cover', event.currentTarget)}
							disabled={props.disabled || props.pending || !props.desktopCoverControls}
							aria-label="Cover image: Profile cover"
						>
							<span className={styles.cardActionIconTopRight}>
								<PencilSimpleIcon size={13} weight="bold" />
							</span>
							<div className={styles.coverCardContent}>
								{props.bannerUrl ? (
									<img src={props.bannerUrl} alt="" className={styles.coverThumbImg} />
								) : (
									<div className={styles.coverEmptyPlaceholder} />
								)}
								<div className={styles.cardBottomLabels}>
									<b>Cover image</b>
									<small>{props.bannerUrl ? 'Custom cover' : 'Profile cover'}</small>
								</div>
							</div>
						</button>
					</div>
				</section>

				{/* 5 Motion & frame */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<span className={styles.numBadge}>5</span>
						<span className={styles.sectionTitle}>Motion & frame</span>
					</div>
					<div className={styles.twoColumnGrid}>
						<button
							type="button"
							className={styles.gridCard}
							onClick={(event) => open('profile-effects', event.currentTarget)}
							disabled={props.disabled || props.pending}
							aria-label={`Profile effect: ${effect?.name ?? (effectId ? 'Selected effect' : 'None')}`}
						>
							<span className={styles.cardActionIconTopRight}>
								<PencilSimpleIcon size={13} weight="bold" />
							</span>
							<div className={styles.motionCardContent}>
								<div className={styles.miniMediaBox}>
									{effectId && (effect?.thumbnail ? <img src={effect.thumbnail} alt="" loading="lazy" /> : <ProfileEffectMedia effectId={effectId} />)}
								</div>
								<div className={styles.cardBottomLabels}>
									<b>Profile effect</b>
									<small>{effect?.name ?? (effectId ? 'Selected effect' : 'None')}</small>
								</div>
							</div>
						</button>
						<button
							type="button"
							className={styles.gridCard}
							onClick={(event) => open('frame', event.currentTarget)}
							disabled={props.disabled || props.pending}
							aria-label={`Profile frame: ${frame?.name ?? (appearance.cardFrame === 'none' ? 'No frame' : titleCase(appearance.cardFrame))}`}
						>
							<span className={styles.cardActionIconTopRight}>
								<PencilSimpleIcon size={13} weight="bold" />
							</span>
							<div className={styles.motionCardContent}>
								<div className={styles.miniMediaBox}>
									{appearance.cardFrame !== 'none' && <ProfileFrameMedia frame={appearance.cardFrame} size={48} />}
								</div>
								<div className={styles.cardBottomLabels}>
									<b>Profile frame</b>
									<small>{frame?.name ?? (appearance.cardFrame === 'none' ? 'No frame' : titleCase(appearance.cardFrame))}</small>
								</div>
							</div>
						</button>
					</div>
				</section>

				{/* 6 Profile sections */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<span className={styles.numBadge}>6</span>
						<span className={styles.sectionTitle}>Profile sections</span>
					</div>
					<button
						type="button"
						className={styles.profileSectionsCard}
						onClick={(event) => open('details', event.currentTarget)}
						disabled={props.disabled || props.pending || !props.desktopDetailsControls}
						aria-label="Profile sections: Bio · Status"
					>
						<span className={styles.sectionsCardText}>Bio · Status</span>
						<span className={styles.cardActionIconChevron}>
							<CaretRightIcon size={15} weight="bold" />
						</span>
					</button>
				</section>
			</div>
		</aside>

		<main className={styles.previewArea} aria-label="Live profile preview">
			<div className={styles.previewHeaderArea}>
				<h2 className={styles.previewHeading}>Live preview</h2>
				<p className={styles.previewSubheading}>See how your profile looks in real time.</p>
			</div>
			<div className={styles.previewCardStage}>
				{mainPreview}
			</div>
		</main>
		{(tool === 'avatar' && props.desktopAvatarControls) && cloneElement(props.desktopAvatarControls, {autoOpen: true, onAutoOpen: dismissForManagedPicker})}
		{(tool === 'cover' && props.desktopCoverControls) && cloneElement(props.desktopCoverControls, {autoOpen: true, onAutoOpen: dismissForManagedPicker})}
		{tool && draft && tool !== 'avatar' && tool !== 'cover' && typeof document !== 'undefined' && createPortal(
			<div
				className={styles.backdrop}
				style={{
					'--profile-background-primary': props.value.appearance.profileBackgroundPrimary ?? '#9c1111',
					'--profile-background-secondary': props.value.appearance.profileBackgroundSecondary ?? '#1a0405',
					'--dialog-z-index': dialogZIndex,
					zIndex: dialogZIndex,
				} as CSSProperties}
				onPointerDown={(event) => {
					if (event.target === event.currentTarget) {
						cancel();
					}
				}}
			>
				<section className={styles.dialog} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="profile-tool-title" data-tool={tool} tabIndex={-1}>
					<header className={styles.dialogHeader}>
						<div>
							<span className={styles.dialogEyebrow}>NEXUS · IDENTITY STUDIO</span>
							<h2 id="profile-tool-title" className={styles.dialogTitle}>{titles[tool]}</h2>
						</div>
						<button ref={closeRef} type="button" className={styles.close} aria-label="Close dialog" onClick={cancel}>
							<XIcon size={18}/>
						</button>
					</header>
					<div className={styles.dialogContentRow}>
						<div className={styles.dialogEditor}>
							<div className={styles.scroll}>
								<fieldset className={styles.controlLock} disabled={props.disabled || props.pending}>
									{controls()}
								</fieldset>
							</div>
						</div>
						<aside className={clsx(styles.dialogPreview, tool === 'nameplate' && styles.nameplateDialogPreview)}>
							{tool === 'nameplate' ? (
								<div className={styles.nameplatePreviewHeader}>
									<div className={styles.nameplatePreviewTitleGroup}>
										<h3 className={styles.nameplatePreviewTitle}>Live preview</h3>
										<p className={styles.nameplatePreviewSubtitle}>Member row inside a NEXUS server</p>
									</div>
									<div className={styles.nameplatePreviewHeaderActions}>
										<span className={styles.liveBadge}>
											<span className={styles.liveDot} />
											Live
										</span>
										{(props.renderDesktopNameplateControls || props.desktopNameplateControls) && (
											<div className={styles.nameplateUploadBtnWrapper}>
												{props.renderDesktopNameplateControls
													? props.renderDesktopNameplateControls(draft.nameplateSettings, updateNameplate)
													: props.desktopNameplateControls}
											</div>
										)}
									</div>
								</div>
							) : tool === 'profile-effects' ? (
								<div className={styles.effectPreviewHeader}>
									<div className={styles.effectPreviewTitleGroup}>
										<span className={styles.effectPreviewEyebrow}>FULL-CARD PREVIEW</span>
										<p className={styles.effectPreviewSubtitle}>The animation runs over your profile.</p>
									</div>
									<button
										type="button"
										className={styles.effectReplayBtn}
										onClick={() => setReplayKey((key) => key + 1)}
									>
										<ArrowCounterClockwiseIcon size={14} />
										<span>Replay</span>
									</button>
								</div>
							) : (
								<div className={styles.previewHeader}>
									<span>{tool === 'name' ? 'NAME IN SERVERS & MESSAGES' : 'LIVE PREVIEW'}</span>
									{(tool === 'frame' || tool === 'name') && (
										<button type="button" onClick={() => setReplayKey((key) => key + 1)}>
											<ArrowCounterClockwiseIcon size={14}/>
											<span>Replay</span>
										</button>
									)}
								</div>
							)}
							<div className={clsx(styles.previewCanvas, tool === 'nameplate' && styles.nameplatePreviewCanvas)} key={tool === 'frame' || tool === 'profile-effects' || tool === 'name' ? `${tool}:${replayKey}` : undefined}>
								{tool === 'nameplate' ? (
									<div className={styles.nameplateLiveCardContainer}>
										{renderNameplateCard(draft.nameplateSettings)}
									</div>
								) : tool === 'name' ? (
									<div className={styles.nameContext}>
										<span>SERVER MEMBER LIST</span>
										{memberRow(draft.nameplateSettings)}
										<span>DIRECT MESSAGE</span>
										<div className={styles.messagePreviewRow}>
											<span className={styles.messagePreviewAvatar}>
												{props.avatarUrl ? <img src={props.avatarUrl} alt=""/> : (nameDraft || 'N').slice(0, 1).toUpperCase()}
											</span>
											<div>
												<strong><ProfileDisplayName name={nameDraft || 'Your name'} appearance={draft.appearance}/></strong>
												<small>Just now · Message preview</small>
											</div>
										</div>
										<span>PROFILE HEADER</span>
										<strong><ProfileDisplayName name={nameDraft} appearance={draft.appearance}/></strong>
									</div>
								) : (
									preview
								)}
							</div>
							{tool === 'profile-effects' && (
								<div className={styles.effectPreviewBottomBar}>
									<span className={styles.effectPreviewBottomLabel}>SELECTION PREVIEW ONLY</span>
									<span className={styles.effectPreviewSelectedName}>
										{draft.profileEffectId
											? `▷ ${PROFILE_EFFECTS.find((e) => e.id === draft.profileEffectId)?.name ?? 'Selected effect'}`
											: '▷ No effect selected'}
									</span>
								</div>
							)}
						</aside>
					</div>
					<footer className={styles.dialogFooter}>
						<span className={styles.dialogFooterNote}>
							Your profile changes only after you save the studio.
						</span>
						<div className={styles.dialogFooterActions}>
							<button type="button" className={styles.cancelBtn} onClick={cancel}>Cancel</button>
							<button type="button" className={styles.applyBtn} disabled={props.disabled || props.pending} onClick={apply}>
								{tool === 'nameplate' ? 'Apply nameplate' : (
									<>
										<span>Apply</span>
										<ArrowRightIcon size={14} weight="bold" />
									</>
								)}
							</button>
						</div>
					</footer>
				</section>
			</div>, document.body)}
	</div>;
}
