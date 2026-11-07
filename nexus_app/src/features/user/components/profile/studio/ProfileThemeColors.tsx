// SPDX-License-Identifier: Nebula

import type {ColorPickerPopoverProps} from '@app/features/app/components/floating/ColorPickerPopover';
import {createNamedLoadableComponent} from '@app/features/platform/components/loadable/LoadableComponent';
import FocusRing from '@app/features/ui/focus_ring/FocusRing';
import styles from '@app/features/user/components/profile/studio/ProfileThemeColors.module.css';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import type {ProfileAppearance} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {observer} from 'mobx-react-lite';
import {type CSSProperties, useEffect, useMemo, useRef, useState} from 'react';
import {Button, Dialog, DialogTrigger, Popover} from 'react-aria-components';

const ColorPickerPopover = createNamedLoadableComponent<ColorPickerPopoverProps>({
	displayName: 'ColorPickerPopover',
	LoadingComponent: () => <div className={styles.pickerLoading} aria-hidden="true" />,
	load: async () => (await import('@app/features/app/components/floating/ColorPickerPopover')).ColorPickerPopover,
});

const PRIMARY_COLOR_DESCRIPTOR = msg({
	message: 'Primary Color',
	comment: 'Theme color control for the first color in the profile background gradient.',
});
const SECONDARY_COLOR_DESCRIPTOR = msg({
	message: 'Secondary Color',
	comment: 'Theme color control for the second color in the profile background gradient.',
});
const ACCENT_COLOR_DESCRIPTOR = msg({
	message: 'Accent Color',
	comment: 'Theme color control for profile accents and borders, separate from the background colors.',
});
const CHOOSE_COLOR_DESCRIPTOR = msg({
	message: 'Choose {label}',
	comment: 'Accessible label for opening one profile theme color picker.',
});
const HEX_COLOR_DESCRIPTOR = msg({
	message: 'HEX color',
	comment: 'Accessible label for entering a profile theme color as a HEX value.',
});
const PRESET_COLORS_DESCRIPTOR = msg({
	message: 'Preset colors',
	comment: 'Accessible label for the row of preset colors in a theme color picker.',
});
const INVALID_HEX_DESCRIPTOR = msg({
	message: 'Enter a 6-digit HEX color, such as #A31425.',
	comment: 'Validation message for an invalid profile theme HEX color.',
});
const INHERITING_GLOBAL_DESCRIPTOR = msg({
	message: 'Using the main profile theme and effects',
	comment: 'Indicates that a server-specific profile is inheriting appearance settings from the main profile.',
});
const USE_GLOBAL_APPEARANCE_DESCRIPTOR = msg({
	message: 'Use main profile theme and effects',
	comment: 'Resets a server-specific theme and effects override to inherit the main profile settings.',
});
const PRESET_BLACK_DESCRIPTOR = msg({message: 'Black'});
const PRESET_SLATE_DESCRIPTOR = msg({message: 'Slate'});
const PRESET_NEXUS_VIOLET_DESCRIPTOR = msg({message: 'NEXUS violet'});
const PRESET_CRIMSON_DESCRIPTOR = msg({message: 'Crimson'});
const PRESET_ROSE_DESCRIPTOR = msg({message: 'Rose'});
const PRESET_WHITE_DESCRIPTOR = msg({message: 'White'});
const COLOR_PICKER_PRESETS = [
	{label: PRESET_BLACK_DESCRIPTOR, value: '#0B0B0F'},
	{label: PRESET_SLATE_DESCRIPTOR, value: '#24232B'},
	{label: PRESET_NEXUS_VIOLET_DESCRIPTOR, value: '#4641D9'},
	{label: PRESET_CRIMSON_DESCRIPTOR, value: '#A31425'},
	{label: PRESET_ROSE_DESCRIPTOR, value: '#D83B5B'},
	{label: PRESET_WHITE_DESCRIPTOR, value: '#F4F3F8'},
] as const;

const FALLBACK_PRIMARY = '#111116';
const FALLBACK_SECONDARY = '#1C1821';
const FALLBACK_ACCENT = '#245DA7';
const BACKGROUND_PRESETS = [
['#111116', '#1C1821'],
['#08090D', '#651828'],
['#171134', '#5140A0'],
['#081A20', '#16756E'],
['#21120F', '#A1562F'],
['#102035', '#325478'],
] as const;

type BackgroundColors = Pick<ProfileAppearance, 'profileBackgroundPrimary' | 'profileBackgroundSecondary'>;

interface ColorControlProps {
	id: string;
	label: string;
	value: string;
	resetValue: string;
	onChange: (value: string) => void;
	onReset: () => void;
	disabled?: boolean;
}

function normalizeHex(value: string): string | null {
	const candidate = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
	return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toUpperCase() : null;
}

function ThemeColorControl({id, label, value, resetValue, onChange, onReset, disabled}: ColorControlProps) {
	const {i18n} = useLingui();
	const [isOpen, setIsOpen] = useState(false);
	const [hexDraft, setHexDraft] = useState(value);
	const [hexInvalid, setHexInvalid] = useState(false);
	const hexInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (document.activeElement === hexInputRef.current) return;
		setHexDraft(value);
		setHexInvalid(false);
	}, [value]);

	const applyHexDraft = () => {
		const nextValue = normalizeHex(hexDraft);
		if (!nextValue) {
			setHexInvalid(true);
			return;
		}
		onChange(nextValue);
		setHexDraft(nextValue);
		setHexInvalid(false);
	};

	const applyPickerColor = (nextValue: string) => {
		const normalized = normalizeHex(nextValue);
		if (!normalized) return;
		onChange(normalized);
		setHexDraft(normalized);
		setHexInvalid(false);
	};

	return (
		<div className={styles.control} data-flx={`user.profile.theme-colors.${id}`}>
			<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
				<FocusRing within={true} enabled={!disabled}>
					<Button
						className={styles.controlButton}
						style={{'--theme-swatch-color': value} as CSSProperties}
						isDisabled={disabled}
						aria-label={i18n._(CHOOSE_COLOR_DESCRIPTOR, {label})}
						data-flx={`user.profile.theme-colors.${id}.open`}
					>
						<span className={styles.swatch} style={{backgroundColor: value}} aria-hidden="true" />
						<span className={styles.controlText}>
							<strong>{label}</strong>
							<code>{value}</code>
						</span>
					</Button>
				</FocusRing>
				<Popover className={styles.popover} placement="bottom" offset={8}>
					<Dialog className={styles.dialog} aria-label={label}>
						<div className={styles.pickerHeading}>
							<strong>{label}</strong>
							<code>{value}</code>
						</div>
						<ColorPickerPopover
							color={value}
							onChange={applyPickerColor}
							onReset={() => {
								onReset();
								setHexDraft(resetValue);
								setHexInvalid(false);
							}}
							resetColor={resetValue}
							glass={true}
							data-flx={`user.profile.theme-colors.${id}.picker`}
						/>
						<label className={styles.hexField}>
							<span>{i18n._(HEX_COLOR_DESCRIPTOR)}</span>
							<input
								ref={hexInputRef}
								type="text"
								value={hexDraft}
								maxLength={7}
								autoComplete="off"
								spellCheck={false}
								aria-label={i18n._(HEX_COLOR_DESCRIPTOR)}
								aria-invalid={hexInvalid}
								onChange={(event) => {
									const draft = event.currentTarget.value;
									setHexDraft(draft);
									setHexInvalid(false);
									const normalized = normalizeHex(draft);
									if (normalized) onChange(normalized);
								}}
								onBlur={applyHexDraft}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										applyHexDraft();
									}
								}}
								data-flx={`user.profile.theme-colors.${id}.hex`}
							/>
						</label>
						{hexInvalid && <p className={styles.hexError}>{i18n._(INVALID_HEX_DESCRIPTOR)}</p>}
						<div className={styles.presetGroup} role="group" aria-label={i18n._(PRESET_COLORS_DESCRIPTOR)}>
							{COLOR_PICKER_PRESETS.map((preset) => (
								<button
									key={preset.value}
									type="button"
									className={styles.preset}
									style={{backgroundColor: preset.value}}
									title={`${i18n._(preset.label)} ${preset.value}`}
									aria-label={`${i18n._(preset.label)} ${preset.value}`}
									aria-pressed={value.toUpperCase() === preset.value}
									onClick={() => applyPickerColor(preset.value)}
									data-flx={`user.profile.theme-colors.${id}.preset`}
								/>
							))}
						</div>
					</Dialog>
				</Popover>
			</DialogTrigger>
		</div>
	);
}

function cssColorToHex(color: string, fallback: string): string {
	if (/^#[\da-f]{6}$/i.test(color)) return color.toUpperCase();
	if (!color || typeof document === 'undefined') return fallback;

	const context = document.createElement('canvas').getContext('2d');
	if (!context) return fallback;
	context.fillStyle = '#000000';
	context.fillStyle = color;
	const normalized = context.fillStyle;
	if (/^#[\da-f]{6}$/i.test(normalized)) return normalized.toUpperCase();

	const channels = normalized.match(/[\d.]+/g)?.map(Number);
	if (!normalized.startsWith('rgb') || !channels || channels.length < 3) return fallback;
	return `#${channels
		.slice(0, 3)
		.map((channel) =>
			Math.max(0, Math.min(255, Math.round(channel)))
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`.toUpperCase();
}

function colorNumberToHex(color: number): string {
	return `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`.toUpperCase();
}

function hexToColorNumber(color: string): number {
	return Number.parseInt(color.slice(1), 16) >>> 0;
}

interface ProfileThemeColorsProps {
	presentation?: 'default' | 'desktop';
	appearance: ProfileAppearance;
	accentColor: number | null;
	globalAppearance?: ProfileAppearance;
	globalAccentColor?: number | null;
	isPerGuildProfile: boolean;
	isInherited?: boolean;
	onAppearanceChange: (colors: BackgroundColors) => void;
	onAccentColorChange: (color: number | null) => void;
	onUseGlobalAppearance?: () => void;
	disabled?: boolean;
}

export const ProfileThemeColors = observer(
	({
presentation = 'default',
		appearance,
		accentColor,
		globalAppearance,
		globalAccentColor,
		isPerGuildProfile,
		isInherited,
		onAppearanceChange,
		onAccentColorChange,
		onUseGlobalAppearance,
		disabled,
	}: ProfileThemeColorsProps) => {
		const {i18n} = useLingui();
		const rootDefaults = useMemo(() => {
			if (typeof document === 'undefined') {
				return {primary: FALLBACK_PRIMARY, secondary: FALLBACK_SECONDARY};
			}
			const rootStyle = getComputedStyle(document.body ?? document.documentElement);
			return {
				primary: cssColorToHex(rootStyle.getPropertyValue('--background-primary').trim(), FALLBACK_PRIMARY),
				secondary: cssColorToHex(rootStyle.getPropertyValue('--background-secondary-alt').trim(), FALLBACK_SECONDARY),
			};
		}, []);

		const primary = appearance.profileBackgroundPrimary ?? rootDefaults.primary;
		const secondary = appearance.profileBackgroundSecondary ?? rootDefaults.secondary;
		const globalPrimary = globalAppearance?.profileBackgroundPrimary ?? rootDefaults.primary;
		const globalSecondary = globalAppearance?.profileBackgroundSecondary ?? rootDefaults.secondary;
		const accent = accentColor === null ? FALLBACK_ACCENT : colorNumberToHex(accentColor);
		const globalAccent = globalAccentColor == null ? FALLBACK_ACCENT : colorNumberToHex(globalAccentColor);

		const updateColor = (field: keyof BackgroundColors, value: string) => {
			onAppearanceChange({
				profileBackgroundPrimary: field === 'profileBackgroundPrimary' ? value : primary,
				profileBackgroundSecondary: field === 'profileBackgroundSecondary' ? value : secondary,
			});
		};

		return (
			<div className={`${styles.controls} ${presentation === 'desktop' ? styles.desktopControls : ''}`} data-flx="user.profile.theme-colors">
				{isPerGuildProfile && isInherited && (
					<p className={styles.scopeStatus}>{i18n._(INHERITING_GLOBAL_DESCRIPTOR)}</p>
				)}
				{isPerGuildProfile && !isInherited && (
					<button type="button" className={styles.inheritButton} onClick={onUseGlobalAppearance} disabled={disabled}>
						{i18n._(USE_GLOBAL_APPEARANCE_DESCRIPTOR)}
					</button>
				)}
				<div className={presentation === 'desktop' ? styles.desktopPair : styles.controlPair}>
				{presentation === 'desktop' && (
					<div className={styles.gradientPreview} role="img" aria-label={`${primary} → ${secondary}`}
						style={{background: `linear-gradient(180deg, ${primary}, ${secondary})`}}>
						<i style={{backgroundColor: primary}} /><i style={{backgroundColor: secondary}} />
					</div>
				)}
				<ThemeColorControl
					id="primary"
					label={i18n._(PRIMARY_COLOR_DESCRIPTOR)}
					value={primary}
					resetValue={isPerGuildProfile ? globalPrimary : rootDefaults.primary}
					onChange={(value) => updateColor('profileBackgroundPrimary', value)}
					onReset={() =>
						updateColor('profileBackgroundPrimary', isPerGuildProfile ? globalPrimary : rootDefaults.primary)
					}
					disabled={disabled}
				/>
				<ThemeColorControl
					id="secondary"
					label={i18n._(SECONDARY_COLOR_DESCRIPTOR)}
					value={secondary}
					resetValue={isPerGuildProfile ? globalSecondary : rootDefaults.secondary}
					onChange={(value) => updateColor('profileBackgroundSecondary', value)}
					onReset={() =>
						updateColor('profileBackgroundSecondary', isPerGuildProfile ? globalSecondary : rootDefaults.secondary)
					}
					disabled={disabled}
				/>
				</div>
				<ThemeColorControl
					id="accent"
					label={i18n._(ACCENT_COLOR_DESCRIPTOR)}
					value={accent}
					resetValue={isPerGuildProfile ? globalAccent : FALLBACK_ACCENT}
					onChange={(value) => onAccentColorChange(hexToColorNumber(value))}
					onReset={() => onAccentColorChange(isPerGuildProfile ? (globalAccentColor ?? null) : null)}
					disabled={disabled}
				/>
				{presentation === 'desktop' && (
					<div className={styles.backgroundPresets}>
						<div className={styles.presetHeading}>
							<strong><Trans>Color palettes</Trans></strong>
							<button type="button" disabled={disabled} onClick={() => onAppearanceChange({
								profileBackgroundPrimary: secondary,
								profileBackgroundSecondary: primary,
							})}><Trans>Swap colors</Trans></button>
						</div>
						<div className={styles.backgroundPresetGrid}>
							{BACKGROUND_PRESETS.map(([top, bottom]) => (
								<button key={top} type="button" disabled={disabled}
									aria-label={`${top} → ${bottom}`}
									aria-pressed={primary.toLowerCase() === top.toLowerCase() && secondary.toLowerCase() === bottom.toLowerCase()}
									style={{background: `linear-gradient(180deg, ${top}, ${bottom})`}}
									onClick={() => onAppearanceChange({profileBackgroundPrimary: top, profileBackgroundSecondary: bottom})}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		);
	},
);
