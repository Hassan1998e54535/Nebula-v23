// SPDX-License-Identifier: Nebula

import type {ColorPickerPopoverProps} from '@app/features/app/components/floating/ColorPickerPopover';
import {CustomStatusDisplay} from '@app/features/app/components/shared/custom_status_display/CustomStatusDisplay';
import type {Guild} from '@app/features/guild/models/Guild';
import type {GuildMember} from '@app/features/member/models/GuildMember';
import {createNamedLoadableComponent} from '@app/features/platform/components/loadable/LoadableComponent';
import {BottomSheet} from '@app/features/ui/bottom_sheet/BottomSheet';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import {CustomStatusModal} from '@app/features/user/components/modals/CustomStatusModal';
import mobileSheetStyles from '@app/features/user/components/modals/UserProfileMobileSheet.module.css';
import {UserProfileBadges} from '@app/features/user/components/popouts/UserProfileBadges';
import {UserProfilePreviewBio} from '@app/features/user/components/popouts/UserProfileShared';
import {ProfileDisplayName} from '@app/features/user/components/profile/media/ProfileDisplayName';
import {AvatarDecorationMedia, NameplateMedia, ProfileEffectMedia, ProfileFrameMedia} from '@app/features/user/components/profile/media/ProfileMedia';
import {DECORATIONS, FRAMES, NAMEPLATES, PROFILE_EFFECTS, resolveNameplateId} from '@app/features/user/components/profile/media/profileMediaCatalog';
import {ProfilePreview} from '@app/features/user/components/profile/ProfilePreview';
import {ProfileCardBanner} from '@app/features/user/components/profile/profile_card/ProfileCardBanner';
import {getNameEffectSettings, withNameColors} from '@app/features/user/components/profile/studio/nameStyleColors';
import type {User} from '@app/features/user/models/User';
import type {CustomStatus} from '@app/features/user/state/CustomStatus';
import {createMockProfile} from '@app/features/user/utils/ProfileUtils';
import type {ProfileAppearance, ProfileCustomization} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {DEFAULT_PROFILE_CUSTOMIZATION} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {
	ArrowsCounterClockwiseIcon,
	CaretRightIcon,
	CheckIcon,
	DiceFiveIcon,
	PencilSimpleIcon,
	ProhibitIcon,
	SparkleIcon,
	XCircleIcon,
	XIcon,
} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import React, {cloneElement, type CSSProperties, type ReactElement, useMemo, useRef, useState} from 'react';
import type {UseFormReturn} from 'react-hook-form';
import styles from './DiscordMobileProfileEditor.module.css';
import type {UserProfile} from '@nexus/schema/src/domains/user/UserResponseSchemas';

const ColorPickerPopover = createNamedLoadableComponent<ColorPickerPopoverProps>({
	displayName: 'MobileProfileThemeColorPicker',
	LoadingComponent: () => <div className={styles.customThemeColorPickerLoading} aria-hidden="true" />,
	load: async () => (await import('@app/features/app/components/floating/ColorPickerPopover')).ColorPickerPopover,
});

const FONT_CHOICES: ReadonlyArray<{value: ProfileAppearance['nameFont']; label: string; family: string}> = [
	{value: 'nexus', label: 'NEXUS Sans', family: 'inherit'},
	{value: 'editorial', label: 'Vampyre', family: 'Georgia, serif'},
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

const EFFECTS: ReadonlyArray<{value: ProfileAppearance['nameEffect']; label: string}> = [
	{value: 'solid', label: 'Solid'},
	{value: 'gradient', label: 'Gradient'},
	{value: 'neon', label: 'Neon'},
	{value: 'outline', label: 'Toon'},
	{value: 'bounce', label: 'Pop'},
	{value: 'wave', label: 'Gummy'},
	{value: 'prism', label: 'Prism'},
	{value: 'shimmer', label: 'Glimmer'},
	{value: 'flow', label: 'Flow'},
	{value: 'pulse', label: 'Pulse'},
	{value: 'aurora', label: 'Aurora'},
	{value: 'ember', label: 'Ember'},
];

const COLOR_SWATCHES = [
	'#FF0000', '#FF6600', '#FFCC00', '#2ECC71',
	'#1ABC9C', '#3498DB', '#9B59B6', '#E91E63',
	'#FFFFFF', '#95A5A6', '#34495E', '#B81414',
];

const THEME_PRESETS = [
	{name: 'Crimson Flame', primary: '#b81414', secondary: '#1e0808'},
	{name: 'Midnight Blue', primary: '#1a365d', secondary: '#0f172a'},
	{name: 'Deep Abyss', primary: '#18191c', secondary: '#090a0c'},
	{name: 'Emerald Grove', primary: '#134e4a', secondary: '#064e3b'},
	{name: 'Dark Nebula', primary: '#3b0764', secondary: '#1e1b4b'},
	{name: 'Molten Gold', primary: '#78350f', secondary: '#451a03'},
];

function normalizeThemeHex(value: string): string | null {
	const candidate = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
	return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toUpperCase() : null;
}

type ModalScreen = 'none' | 'decoration' | 'theme' | 'themeColorPicker' | 'frame' | 'effects' | 'nameplate' | 'nameStyle' | 'fontPicker' | 'effectPicker' | 'colorPicker';

interface DiscordMobileProfileEditorProps {
	user: User;
	form: UseFormReturn<any>;
	selectedGuildId: string | null;
	selectedGuild: Guild | null;
	guildMember: GuildMember | null;
guildMemberProfile?: UserProfile | null;
	onSelectGuildId: (guildId: string | null) => void;
	onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
	onClose: () => void;
	hasUnsavedChanges: boolean;
	isSubmitting: boolean;
	isProfileCustomizationLocked: boolean;
	isPerGuildProfileCustomizationDisabled: boolean;
	canChangeNickname: boolean;
	avatarUrl: string | null;
	bannerUrl: string | null;
	previewCustomStatus?: CustomStatus | null;
	avatarUploader?: ReactElement;
	bannerUploader?: ReactElement;
	bio?: string | null;
	pronouns?: string | null;
	onOpenFullPreview?: () => void;
}

export const DiscordMobileProfileEditor = observer(function DiscordMobileProfileEditor({
	user,
	form,
	selectedGuildId,
	guildMember,
guildMemberProfile,
	onSelectGuildId,
	onSubmit,
	onClose,
	hasUnsavedChanges,
	isSubmitting,
	isProfileCustomizationLocked,
	isPerGuildProfileCustomizationDisabled,
	canChangeNickname,
	avatarUrl,
	bannerUrl,
	previewCustomStatus,
	avatarUploader,
	bannerUploader,
	bio,
	pronouns,
}: DiscordMobileProfileEditorProps) {
	const isPerGuild = Boolean(selectedGuildId);
	const [activeScreen, setActiveScreen] = useState<ModalScreen>('none');

	// Active Customization from form
	const rawCustomization: ProfileCustomization =
form.watch('profile_appearance') ??
(isPerGuild ? user.profileAppearance : null) ??
DEFAULT_PROFILE_CUSTOMIZATION;
	const appearance = rawCustomization.appearance ?? DEFAULT_PROFILE_CUSTOMIZATION.appearance;
	const editorCardAppearance: ProfileAppearance =
		activeScreen === 'decoration' ? {...appearance, avatarDecoration: 'none'} : appearance;

	const displayName = isPerGuild
		? (form.watch('nick') ?? guildMember?.nick ?? user.globalName ?? user.username)
		: (form.watch('global_name') ?? user.globalName ?? user.username);

	const primaryColor = appearance.profileBackgroundPrimary ?? '#b81414';
	const secondaryColor = appearance.profileBackgroundSecondary ?? '#140808';

	const updateAppearance = (patch: Partial<ProfileAppearance>) => {
		const nextAppearance = {
			...appearance,
			...patch,
		};
		const next: ProfileCustomization = {
			...rawCustomization,
			appearance: nextAppearance,
		};
		form.setValue('profile_appearance', next, {shouldDirty: true, shouldTouch: true});
		if (patch.profileBackgroundPrimary) {
			const num = parseInt(patch.profileBackgroundPrimary.replace('#', ''), 16);
			if (!Number.isNaN(num)) {
				form.setValue('accent_color', num, {shouldDirty: true, shouldTouch: true});
			}
		}
		setHasLocalDirty(true);
	};

	const swapColors = () => {
		updateAppearance({
			profileBackgroundPrimary: secondaryColor,
			profileBackgroundSecondary: primaryColor,
		});
	};

	// Name Style labels
	const currentFont = FONT_CHOICES.find((f) => f.value === appearance.nameFont) ?? FONT_CHOICES[1];
	const currentEffect = EFFECTS.find((e) => e.value === appearance.nameEffect) ?? EFFECTS[0];
	const nameEffectSettings = getNameEffectSettings(appearance, appearance.nameEffect);
	const nameColors = nameEffectSettings.colors;
	const currentColor = nameColors[0] ?? '#FF0000';

	// Draft selections
	const [draftDecor, setDraftDecor] = useState<string>(appearance.avatarDecoration ?? 'none');
	const [draftFrame, setDraftFrame] = useState<string>(appearance.cardFrame ?? 'none');
	const [draftEffect, setDraftEffect] = useState<string | null>(rawCustomization.profileEffectId ?? null);
	const [draftNameplate, setDraftNameplate] = useState<ProfileCustomization['nameplateSettings']>(
		rawCustomization.nameplateSettings ?? DEFAULT_PROFILE_CUSTOMIZATION.nameplateSettings,
	);
	const [draftFont, setDraftFont] = useState(appearance.nameFont ?? 'editorial');
	const [draftEffectType, setDraftEffectType] = useState(appearance.nameEffect ?? 'solid');
	const [draftColor, setDraftColor] = useState(currentColor);
	const [hasLocalDirty, setHasLocalDirty] = useState(false);

	const watchedBio = form.watch('bio');
	const effectiveBio = watchedBio !== undefined ? watchedBio : bio;
	const cardSurfaceRef = useRef<HTMLDivElement>(null);

	const mockProfile = useMemo(
		() =>
			createMockProfile(user, {
				previewBannerUrl: bannerUrl,
				previewBio: effectiveBio,
				previewPronouns: pronouns,
				previewCustomization: rawCustomization,
			}),
		[user, bannerUrl, effectiveBio, pronouns, rawCustomization],
	);

	// Uploader triggers
	const [showAvatarUpload, setShowAvatarUpload] = useState(false);
	const [showBannerUpload, setShowBannerUpload] = useState(false);

	// Theme target
	const [themeTarget, setThemeTarget] = useState<'primary' | 'secondary'>('primary');
const [customThemeColorTarget, setCustomThemeColorTarget] = useState<'primary' | 'secondary'>('primary');
const [customThemeColorDraft, setCustomThemeColorDraft] = useState(primaryColor);
const [customThemeColorHex, setCustomThemeColorHex] = useState(primaryColor);
const [customThemeColorInvalid, setCustomThemeColorInvalid] = useState(false);

const previewDecorationId =
draftDecor !== 'none' && DECORATIONS.some((decoration) => decoration.id === draftDecor) ? draftDecor : null;

const openCustomThemeColorPicker = () => {
	const currentColor = themeTarget === 'primary' ? primaryColor : secondaryColor;
	setCustomThemeColorTarget(themeTarget);
	setCustomThemeColorDraft(currentColor);
	setCustomThemeColorHex(currentColor);
	setCustomThemeColorInvalid(false);
	setActiveScreen('themeColorPicker');
};

const syncCustomThemeColor = (nextColor: string) => {
	const normalized = normalizeThemeHex(nextColor);
	if (!normalized) return;
	setCustomThemeColorDraft(normalized);
	setCustomThemeColorHex(normalized);
	setCustomThemeColorInvalid(false);
};

const applyCustomThemeColor = () => {
	const normalized = normalizeThemeHex(customThemeColorHex);
	if (!normalized) {
		setCustomThemeColorInvalid(true);
		return;
	}
	if (customThemeColorTarget === 'primary') {
		updateAppearance({profileBackgroundPrimary: normalized});
	} else {
		updateAppearance({profileBackgroundSecondary: normalized});
	}
	setActiveScreen('theme');
};

	const isNameStyled = appearance.nameStyleEnabled ?? Boolean(appearance.nameFont || appearance.nameEffect || appearance.nameColorStart);
	const displayNameAppearance = useMemo(
		() => ({
			...appearance,
			nameStyleEnabled: isNameStyled,
			nameColorEnabled: appearance.nameColorEnabled ?? true,
		}),
		[appearance, isNameStyled],
	);

	return (
		<div
			className={styles.container}
			style={
				{
					'--profile-bg-primary': primaryColor,
					'--profile-bg-secondary': secondaryColor,
				} as CSSProperties
			}
		>
			{/* Hidden Uploaders - Keep continuously mounted to preserve upload and crop state */}
			<div style={{display: 'none'}} aria-hidden="true">
				{avatarUploader &&
					cloneElement(avatarUploader, {
						autoOpen: showAvatarUpload,
						onAutoOpen: () => setShowAvatarUpload(false),
					})}
				{bannerUploader &&
					cloneElement(bannerUploader, {
						autoOpen: showBannerUpload,
						onAutoOpen: () => setShowBannerUpload(false),
					})}
			</div>

			{/* ================= Screen 1: صفحة تعديل الملف الشخصي ================= */}
			<header className={styles.stickyHeader}>
				<div className={styles.headerTop}>
					<button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
						aria-label="Close"
					>
						<XIcon size={22} weight="bold" />
					</button>
					<h1 className={styles.headerTitle}>تعديل الملف الشخصي</h1>
					<button
						type="button"
						className={styles.saveButton}
						onClick={async () => {
							await onSubmit();
							setHasLocalDirty(false);
						}}
						disabled={(!hasUnsavedChanges && !hasLocalDirty && !form.formState.isDirty) || isSubmitting || isProfileCustomizationLocked}
					>
						حفظ
					</button>
				</div>
				<nav className={styles.tabsContainer} aria-label="Profile scopes">
					<button
						type="button"
						className={styles.tabButton}
						data-active={!isPerGuild}
						onClick={() => onSelectGuildId(null)}
					>
						الملف الشخصي العام
					</button>
					<button
						type="button"
						className={styles.tabButton}
						data-active={isPerGuild}
						onClick={() => onSelectGuildId(selectedGuildId || (user.guilds?.[0]?.id ?? 'default'))}
					>
						ملفات السيرفرات
					</button>
				</nav>
			</header>

			{/* Continuous Themed Profile Card Surface (Gradient all the way down behind all fields) */}
			<div className={styles.cardWrapper}>
				<div
					ref={cardSurfaceRef}
					className={styles.cardSurface}
					data-frame={appearance.cardFrame ?? 'none'}
					style={
						{
							'--profile-bg-primary': primaryColor,
							'--profile-bg-secondary': secondaryColor,
							background: `linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
						} as CSSProperties
					}
				>
				{/* Full-Card Active Profile Effect Layer (Live Animation covering entire card) */}
				{rawCustomization.profileEffectId && activeScreen !== 'effects' && (
					<div className={styles.effectOverlay}>
						<ProfileEffectMedia effectId={rawCustomization.profileEffectId} />
					</div>
				)}

				<div
					className={mobileSheetStyles.profileHeaderArea}
					style={
						{
							'--mobile-avatar-size': '80px',
							'--profile-sheet-accent': primaryColor,
							'--profile-background-primary': primaryColor,
							'--profile-background-secondary': secondaryColor,
						} as CSSProperties
					}
				>
					<ProfileCardBanner
						variant="expanded"
						bannerUrl={bannerUrl}
						hoverBannerUrl={null}
						bannerColor={primaryColor}
						user={user}
						avatarUrl={avatarUrl}
						hoverAvatarUrl={null}
						appearance={editorCardAppearance}
						avatarSize={80}
						isClickable={true}
						showEditControls={true}
						onAvatarClick={() => setShowAvatarUpload(true)}
						onBannerClick={() => setShowBannerUpload(true)}
					/>
					<div className={mobileSheetStyles.mobileIdentity}>
						<div className={mobileSheetStyles.mobileIdentityContent}>
							<div className={mobileSheetStyles.usernameContainer}>
								{/* Section 1: Display Name */}
								<div className={mobileSheetStyles.usernameRow}>
									<span className={mobileSheetStyles.username} style={{color: 'inherit'}}>
										<ProfileDisplayName
											name={displayName}
											appearance={displayNameAppearance}
										/>
									</span>
								</div>
								{/* Section 2: Username / Tag Handle (e.g. developer#0) */}
								<div className={mobileSheetStyles.tagBadgeRow}>
									<span className={mobileSheetStyles.usernameHandle}>
										{user.tag ?? `${user.username}#${user.discriminator || '0'}`}
									</span>
								</div>
								{/* Section 3: Custom Status (e.g. ☺ تعيين حالة مخصصة or custom status text) */}
								<div className={mobileSheetStyles.customStatusRow}>
									<CustomStatusDisplay
										userId={user.id}
										customStatus={previewCustomStatus ?? user.customStatus}
										className={mobileSheetStyles.customStatusText}
										showPlaceholder={true}
										isEditable={true}
										onEdit={() => {
											ModalCommands.push(
												modal(() => <CustomStatusModal />),
											);
										}}
										allowJumboEmoji
										maxLines={2}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className={styles.profileCardContent}>
					<div className={mobileSheetStyles.belowCoverBadges}>
						<UserProfileBadges
							user={user}
							profile={mockProfile}
							isModal={true}
							isMobile={true}
						/>
					</div>

					{/* Live Bio Preview Quote Box (matching desktop Screenshot 4 & mobile Screenshot 5) */}
					{effectiveBio && (
						<div className={mobileSheetStyles.contentPadding} style={{paddingBottom: '0.4rem'}}>
							<div className={mobileSheetStyles.bioSection}>
								<h3 className={mobileSheetStyles.bioHeader}>نبذة عني</h3>
								<UserProfilePreviewBio profile={mockProfile} onShowMore={() => {}} />
							</div>
						</div>
					)}
				</div>

				{/* Fields List (Glassmorphic cards floating on top of the continuous card) */}
				<div className={styles.fieldsList}>
				{/* Discord Mobile Profile Theme (Two Side-by-Side Boxes: Primary & Accent) */}
				<div className={styles.fieldGroup}>
<div className={styles.fieldLabel}>مظهر الملف الشخصي</div>
					<div className={styles.themeBoxesRow}>
						<button
							type="button"
							className={styles.themeColorBox}
							style={{backgroundColor: primaryColor}}
							onClick={() => {
								setThemeTarget('primary');
								setActiveScreen('theme');
							}}
						>
							<span className={styles.themePencilBadge}>
								<PencilSimpleIcon size={14} weight="fill" />
							</span>
							<span className={styles.themeBoxName}>الأساسي</span>
						</button>

						<button
							type="button"
							className={styles.swapBtnMini}
							onClick={swapColors}
							aria-label="عكس التدرج"
							title="عكس التدرج"
						>
							<ArrowsCounterClockwiseIcon size={18} weight="bold" />
						</button>

						<button
							type="button"
							className={styles.themeColorBox}
							style={{backgroundColor: secondaryColor}}
							onClick={() => {
								setThemeTarget('secondary');
								setActiveScreen('theme');
							}}
						>
							<span className={styles.themePencilBadge}>
								<PencilSimpleIcon size={14} weight="fill" />
							</span>
							<span className={styles.themeBoxName}>الثانوي</span>
						</button>
					</div>
				</div>

				{/* Display Name Input */}
				<div className={styles.fieldGroup}>
<div className={styles.fieldLabel}>الاسم الظاهر</div>
					<div className={styles.inputCard}>
						<input
							type="text"
							className={styles.textInput}
							value={displayName}
							onChange={(e) => {
								form.setValue(isPerGuild ? 'nick' : 'global_name', e.target.value, {shouldDirty: true, shouldTouch: true});
								setHasLocalDirty(true);
							}}
							maxLength={32}
							placeholder="الاسم الظاهر"
							disabled={isProfileCustomizationLocked || (isPerGuild && !canChangeNickname)}
						/>
						{displayName && (
							<button
								type="button"
								className={styles.clearBtn}
								onClick={() => {
									form.setValue(isPerGuild ? 'nick' : 'global_name', '', {shouldDirty: true, shouldTouch: true});
									setHasLocalDirty(true);
								}}
								aria-label="مسح الاسم"
							>
								<XCircleIcon size={18} weight="fill" />
							</button>
						)}
					</div>
				</div>

				{/* Bio Input (About Me) */}
				<div className={styles.fieldGroup}>
<div className={styles.fieldLabel}>نبذة عني</div>
					<div className={styles.inputCard} style={{padding: '0.5rem 0.75rem'}}>
						<textarea
							className={styles.bioTextarea}
							value={form.watch('bio') ?? bio ?? ''}
							placeholder="أخبر الجميع عن نفسك..."
							maxLength={190}
							rows={3}
							onChange={(e) => {
								form.setValue('bio', e.target.value, {shouldDirty: true, shouldTouch: true});
								setHasLocalDirty(true);
							}}
							disabled={isProfileCustomizationLocked}
						/>
					</div>
				</div>

				{/* ستايل الاسم الظاهر */}
				<button
					type="button"
					className={styles.rowItem}
					onClick={() => {
						setDraftFont(appearance.nameFont ?? 'editorial');
						setDraftEffectType(appearance.nameEffect ?? 'solid');
						setDraftColor(currentColor);
						setActiveScreen('nameStyle');
					}}
				>
					<div className={styles.rowLeft}>
						<span className={styles.rowIcon} style={{fontFamily: currentFont.family, fontWeight: 700}}>
							Gg
						</span>
						<div className={styles.rowTexts}>
							<strong className={styles.rowTitle}>ستايل الاسم الظاهر</strong>
							<span className={styles.rowSubtitle}>{currentFont.label} + {currentEffect.label}</span>
						</div>
					</div>
					<div className={styles.rowRight}>
						<span className={styles.colorSwatchSquare} style={{backgroundColor: currentColor}} />
						<CaretRightIcon size={18} className={styles.chevronIcon} />
					</div>
				</button>

				{/* زخرفة الصورة الشخصية */}
				<button
					type="button"
					className={styles.rowItem}
					onClick={() => {
						setDraftDecor(appearance.avatarDecoration ?? 'none');
						setActiveScreen('decoration');
					}}
				>
					<div className={styles.rowLeft}>
						<span className={styles.rowIcon}>
							{appearance.avatarDecoration && appearance.avatarDecoration !== 'none' ? (
								<AvatarDecorationMedia decoration={appearance.avatarDecoration} size={28} />
							) : (
								<ProhibitIcon size={20} weight="bold" />
							)}
						</span>
						<div className={styles.rowTexts}>
							<strong className={styles.rowTitle}>زخرفة الصورة الشخصية</strong>
							<span className={styles.rowSubtitle}>
								{DECORATIONS.find((d) => d.id === appearance.avatarDecoration)?.label ?? 'لا يوجد'}
							</span>
						</div>
					</div>
					<CaretRightIcon size={18} className={styles.chevronIcon} />
				</button>

				{/* إطار الملف الشخصي */}
				<button
					type="button"
					className={styles.rowItem}
					onClick={() => {
						setDraftFrame(appearance.cardFrame ?? 'none');
						setActiveScreen('frame');
					}}
				>
					<div className={styles.rowLeft}>
						<span className={styles.rowIcon}>
							{appearance.cardFrame && appearance.cardFrame !== 'none' ? (
								<ProfileFrameMedia frame={appearance.cardFrame} size={28} />
							) : (
								<ProhibitIcon size={20} weight="bold" />
							)}
						</span>
						<div className={styles.rowTexts}>
							<strong className={styles.rowTitle}>إطار الملف الشخصي</strong>
							<span className={styles.rowSubtitle}>
								{FRAMES.find((f) => f.id === appearance.cardFrame)?.name ?? 'لا يوجد'}
							</span>
						</div>
					</div>
					<CaretRightIcon size={18} className={styles.chevronIcon} />
				</button>

				{/* لوحة الاسم */}
				<button
					type="button"
					className={styles.rowItem}
					disabled={isProfileCustomizationLocked || (isPerGuild && isPerGuildProfileCustomizationDisabled)}
					onClick={() => {
						setDraftNameplate({
							...(rawCustomization.nameplateSettings ?? DEFAULT_PROFILE_CUSTOMIZATION.nameplateSettings),
						});
						setActiveScreen('nameplate');
					}}
				>
					<div className={styles.rowLeft}>
						<span className={styles.rowIcon}>
							{rawCustomization.nameplateSettings?.nameplate && rawCustomization.nameplateSettings.nameplate !== 'none' ? (
								<span className={styles.nameplateRowIcon}>
									<NameplateMedia settings={rawCustomization.nameplateSettings} />
								</span>
							) : (
								<ProhibitIcon size={20} weight="bold" />
							)}
						</span>
						<div className={styles.rowTexts}>
							<strong className={styles.rowTitle}>لوحة الاسم</strong>
							<span className={styles.rowSubtitle}>
								{rawCustomization.nameplateSettings?.nameplate === 'custom'
									? rawCustomization.nameplateSettings.nameplateImage ?? 'مخصص'
									: NAMEPLATES.find((item) => item.id === resolveNameplateId(rawCustomization.nameplateSettings?.nameplate ?? 'none'))?.label ?? 'لا يوجد'}
							</span>
						</div>
					</div>
					<CaretRightIcon size={18} className={styles.chevronIcon} />
				</button>

				{/* تأثير الملف الشخصي */}
				<button
					type="button"
					className={styles.rowItem}
					onClick={() => {
						setDraftEffect(rawCustomization.profileEffectId ?? null);
						setActiveScreen('effects');
					}}
				>
					<div className={styles.rowLeft}>
						<span className={styles.rowIcon}>
							<SparkleIcon size={20} weight="duotone" />
						</span>
						<div className={styles.rowTexts}>
							<strong className={styles.rowTitle}>تأثير الملف الشخصي</strong>
							<span className={styles.rowSubtitle}>
								{PROFILE_EFFECTS.find((p) => p.id === rawCustomization.profileEffectId)?.name ?? 'لا يوجد'}
							</span>
						</div>
					</div>
					<CaretRightIcon size={18} className={styles.chevronIcon} />
				</button>
				</div>
				</div>
				<ProfileFrameMedia frame={appearance.cardFrame ?? 'none'} cardRef={cardSurfaceRef} />
			</div>

			{/* ================= Screen: اختيار لوحة الاسم ================= */}
			{activeScreen === 'nameplate' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('none')}
					title="لوحة الاسم"
					initialSnap={0.92}
					snapPoints={[0, 0.72, 0.92, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<section className={styles.nameplateMemberPreview} aria-label="معاينة قائمة الأعضاء">
							{[0, 1, 2, 3, 4].map((row) => (
								<div className={styles.nameplateMemberRow} data-current={row === 2} key={row}>
									{row === 2 ? (
										<>
{draftNameplate.nameplate !== 'none' && <NameplateMedia settings={draftNameplate} />}
											<span className={styles.nameplateMemberAvatar}>
												{avatarUrl ? <img src={avatarUrl} alt="" /> : (displayName || 'N').slice(0, 1).toUpperCase()}
											</span>
											<span className={styles.nameplateMemberName}>
												<ProfileDisplayName name={displayName || user.username} appearance={displayNameAppearance} />
												<small>أنت · متصل</small>
											</span>
										</>
									) : (
										<>
											<span className={styles.nameplatePlaceholderAvatar} />
											<span className={styles.nameplatePlaceholderName} />
										</>
									)}
								</div>
							))}
						</section>

						<div className={styles.nameplateOptionsHeading}>
							<h3 className={styles.decorationSectionTitle}>لوحات الاسم المتاحة</h3>
							<span>{NAMEPLATES.length + 1 + (draftNameplate.nameplateUploads?.length ?? 0)}</span>
						</div>
						<div className={styles.nameplateOptions} role="group" aria-label="اختر لوحة الاسم">
							<button
								type="button"
								className={styles.nameplateOption}
								data-selected={draftNameplate.nameplate === 'none'}
								aria-pressed={draftNameplate.nameplate === 'none'}
								disabled={isProfileCustomizationLocked || (isPerGuild && isPerGuildProfileCustomizationDisabled)}
								onClick={() => setDraftNameplate({...draftNameplate, nameplate: 'none', nameplateImage: null, nameplateCrop: null})}
							>
								<span className={styles.nameplateOptionPreview}>
									<ProhibitIcon size={20} weight="bold" />
									<span>لا يوجد</span>
								</span>
								<strong>لا يوجد</strong>
								{draftNameplate.nameplate === 'none' && <CheckIcon size={18} weight="bold" />}
							</button>
							{NAMEPLATES.map((item) => {
								const selected = draftNameplate.nameplate !== 'custom' && resolveNameplateId(draftNameplate.nameplate) === item.id;
								const settings: ProfileCustomization['nameplateSettings'] = {
									...draftNameplate,
									nameplate: item.id,
									nameplateImage: null,
									nameplateCrop: null,
								};
								return (
									<button
										key={item.id}
										type="button"
										className={styles.nameplateOption}
										data-selected={selected}
										aria-pressed={selected}
										disabled={isProfileCustomizationLocked || (isPerGuild && isPerGuildProfileCustomizationDisabled)}
										onClick={() => setDraftNameplate(settings)}
									>
										<span className={styles.nameplateOptionPreview}>
											<NameplateMedia settings={settings} />
											<span className={styles.nameplateOptionSample}>{displayName || user.username}</span>
										</span>
										<strong>{item.label}</strong>
										{selected && <CheckIcon size={18} weight="bold" />}
									</button>
								);
							})}
							{(draftNameplate.nameplateUploads ?? []).map((upload) => {
								const selected = draftNameplate.nameplate === 'custom' && draftNameplate.nameplateImage === upload.filename;
								const settings = {...draftNameplate, nameplate: 'custom' as const, nameplateImage: upload.filename};
								return (
									<button
										key={upload.filename}
										type="button"
										className={styles.nameplateOption}
										data-selected={selected}
										aria-pressed={selected}
										disabled={isProfileCustomizationLocked || (isPerGuild && isPerGuildProfileCustomizationDisabled)}
										onClick={() => setDraftNameplate({...settings, nameplateCrop: null})}
									>
										<span className={styles.nameplateOptionPreview}>
											<NameplateMedia settings={settings} />
											<span className={styles.nameplateOptionSample}>{displayName || user.username}</span>
										</span>
										<strong>{upload.filename}</strong>
										{selected && <CheckIcon size={18} weight="bold" />}
									</button>
								);
							})}
						</div>
						<button
							type="button"
							className={styles.actionBtnRed}
							disabled={isProfileCustomizationLocked || (isPerGuild && isPerGuildProfileCustomizationDisabled)}
							onClick={() => {
								form.setValue(
									'profile_appearance',
									{...rawCustomization, nameplateSettings: draftNameplate},
									{shouldDirty: true, shouldTouch: true},
								);
								setHasLocalDirty(true);
								setActiveScreen('none');
							}}
						>
							تطبيق
						</button>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 2: نافذة زخرفة الصورة الشخصية ================= */}
			{activeScreen === 'decoration' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('none')}
					title="زخرفة الصورة الشخصية"
					initialSnap={0.88}
					snapPoints={[0, 0.65, 0.88, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<div className={styles.avatarPreviewArea}>
							<div className={styles.avatarWrapper} data-decoration={previewDecorationId ?? 'none'}>
								<div className={styles.avatarPhotoClip}>
									<img src={avatarUrl || ''} alt="" className={styles.avatarImg} />
								</div>
								{previewDecorationId && (
									<div className={styles.decorationOverlay}>
										<AvatarDecorationMedia decoration={previewDecorationId} size={112} />
									</div>
								)}
							</div>
						</div>

						<h3 className={styles.decorationSectionTitle}>زخارفك</h3>
						<div className={styles.decorGrid}>
							<button
								type="button"
								className={`${styles.decorTile} ${styles.avatarDecorTile}`}
								data-selected={draftDecor === 'none'}
								aria-pressed={draftDecor === 'none'}
								aria-label="لا يوجد"
								onClick={() => setDraftDecor('none')}
							>
								<div className={styles.decorTileIcon}>
									<ProhibitIcon size={28} weight="bold" />
								</div>
								<span className={styles.decorTileText}>لا يوجد</span>
							</button>

							{DECORATIONS.map((d) => (
								<button
									key={d.id}
									type="button"
									className={`${styles.decorTile} ${styles.avatarDecorTile}`}
									data-selected={draftDecor === d.id}
									aria-pressed={draftDecor === d.id}
									aria-label={d.label}
									title={d.label}
									onClick={() => setDraftDecor(d.id)}
								>
									<div className={styles.decorTileIcon}>
										<AvatarDecorationMedia decoration={d.id} size={46} />
									</div>
								</button>
							))}
						</div>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => {
								updateAppearance({avatarDecoration: draftDecor});
								setActiveScreen('none');
							}}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 3: نافذة مظهر الملف الشخصي ================= */}
			{activeScreen === 'theme' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('none')}
					title="مظهر الملف الشخصي"
					initialSnap={0.85}
					snapPoints={[0, 0.65, 0.85, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						{/* Primary & Secondary Hero Boxes */}
						<div className={styles.themeHeroGrid}>
							<button
								type="button"
								className={styles.themeHeroBox}
								style={{backgroundColor: primaryColor}}
								data-selected={themeTarget === 'primary'}
								onClick={() => setThemeTarget('primary')}
							>
								<span className={styles.themeHeroLabel}>الأساسي</span>
								{themeTarget === 'primary' && <CheckIcon size={18} weight="bold" style={{color: '#fff'}} />}
							</button>

							<button
								type="button"
								className={styles.themeHeroBox}
								style={{backgroundColor: secondaryColor}}
								data-selected={themeTarget === 'secondary'}
								onClick={() => setThemeTarget('secondary')}
							>
								<span className={styles.themeHeroLabel}>الثانوي</span>
								{themeTarget === 'secondary' && <CheckIcon size={18} weight="bold" style={{color: '#fff'}} />}
							</button>
						</div>

						{/* Swap Colors Button */}
						<button
							type="button"
							className={styles.actionBtnSecondary}
							onClick={swapColors}
							style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem'}}
						>
							<ArrowsCounterClockwiseIcon size={18} weight="bold" />
							<span>عكس الألوان (تبديل الأساسي والثانوي)</span>
						</button>

						{/* Presets Grid */}
						<span className={styles.fieldLabel}>معاينات التدرجات</span>
						<div className={styles.themePresetsGrid}>
							{THEME_PRESETS.map((p, idx) => (
								<button
									key={idx}
									type="button"
									className={styles.themePresetBox}
									style={{background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`}}
									onClick={() => {
										updateAppearance({
											profileBackgroundPrimary: p.primary,
											profileBackgroundSecondary: p.secondary,
										});
									}}
								/>
							))}
						</div>

						{/* Color Swatches Grid */}
						<span className={styles.fieldLabel}>اختر لون {themeTarget === 'primary' ? 'الأساسي' : 'الثانوي'}</span>
						<div className={styles.colorCirclesGrid}>
							{COLOR_SWATCHES.map((hex) => (
								<button
									key={hex}
									type="button"
									className={styles.colorCircle}
									style={{backgroundColor: hex}}
									data-selected={(themeTarget === 'primary' ? primaryColor : secondaryColor).toUpperCase() === hex.toUpperCase()}
									onClick={() => {
										if (themeTarget === 'primary') {
											updateAppearance({profileBackgroundPrimary: hex});
										} else {
											updateAppearance({profileBackgroundSecondary: hex});
										}
									}}
								/>
							))}
						</div>

						<button
							type="button"
							className={styles.customThemeColorButton}
							onClick={openCustomThemeColorPicker}
							aria-label={`اختيار لون مخصص للون ${themeTarget === 'primary' ? 'الأساسي' : 'الثانوي'}`}
							data-flx="user.profile.mobile-theme.custom-color.open"
						>
							<span
								className={styles.customThemeColorSwatch}
								style={{backgroundColor: themeTarget === 'primary' ? primaryColor : secondaryColor}}
								aria-hidden="true"
							/>
							<span className={styles.customThemeColorButtonText}>اختيار درجة لون مخصصة</span>
							<code>{(themeTarget === 'primary' ? primaryColor : secondaryColor).toUpperCase()}</code>
						</button>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => setActiveScreen('none')}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}

			{activeScreen === 'themeColorPicker' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('theme')}
					title={`لون ${customThemeColorTarget === 'primary' ? 'أساسي' : 'ثانوي'} مخصص`}
					initialSnap={0.85}
					snapPoints={[0, 0.65, 0.85, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<div className={styles.customThemeColorPreview}>
							<span>{customThemeColorTarget === 'primary' ? 'اللون الأساسي' : 'اللون الثانوي'}</span>
							<code>{customThemeColorDraft}</code>
							<i style={{backgroundColor: customThemeColorDraft}} aria-hidden="true" />
						</div>
						<label className={styles.customThemeColorHexField}>
							<span>HEX</span>
							<input
								type="text"
								value={customThemeColorHex}
								maxLength={7}
								autoComplete="off"
								spellCheck={false}
								aria-label="رمز اللون بصيغة HEX"
								aria-invalid={customThemeColorInvalid}
								onChange={(event) => {
									const nextValue = event.currentTarget.value;
									setCustomThemeColorHex(nextValue);
									const normalized = normalizeThemeHex(nextValue);
									if (normalized) {
										setCustomThemeColorDraft(normalized);
										setCustomThemeColorInvalid(false);
									} else {
										setCustomThemeColorInvalid(false);
									}
								}}
							/>
						</label>
						{customThemeColorInvalid && (
							<p className={styles.customThemeColorError} role="alert">
								أدخل رمز HEX صحيحًا من 6 خانات، مثل #A31425.
							</p>
						)}
						<ColorPickerPopover
							color={customThemeColorDraft}
							onChange={syncCustomThemeColor}
							glass={true}
							data-flx="user.profile.mobile-theme.custom-color.picker"
						/>
						<div className={styles.customThemeColorActions}>
							<button type="button" className={styles.actionBtnSecondary} onClick={() => setActiveScreen('theme')}>
								إلغاء
							</button>
							<button type="button" className={styles.actionBtnRed} onClick={applyCustomThemeColor}>
								تطبيق اللون
							</button>
						</div>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 4: نافذة إطار الملف الشخصي ================= */}
			{activeScreen === 'frame' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('none')}
					title="إطار الملف الشخصي"
					initialSnap={0.88}
					snapPoints={[0, 0.65, 0.88, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<div className={styles.decorGrid}>
							<button
								type="button"
								className={styles.decorTile}
								data-selected={draftFrame === 'none'}
								onClick={() => setDraftFrame('none')}
							>
								<div className={styles.decorTileIcon}>
									<ProhibitIcon size={28} weight="bold" />
								</div>
								<span className={styles.decorTileText}>لا يوجد</span>
							</button>

							{FRAMES.map((f) => (
								<button
									key={f.id}
									type="button"
									className={styles.decorTile}
									data-selected={draftFrame === f.id}
									onClick={() => setDraftFrame(f.id)}
								>
									<div className={styles.decorTileIcon}>
										<ProfileFrameMedia frame={f.id} size={48} />
									</div>
									<span className={styles.decorTileText}>{f.name}</span>
								</button>
							))}
						</div>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => {
								updateAppearance({cardFrame: draftFrame});
								setActiveScreen('none');
							}}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 5: نافذة تأثير الملف الشخصي ================= */}
			{activeScreen === 'effects' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('none')}
					title="تأثير الملف الشخصي"
					initialSnap={0.88}
					snapPoints={[0, 0.65, 0.88, 1]}
					surface="primary"
				>
					<div className={`${styles.sheetContainer} ${styles.effectPickerContainer}`}>
						<div className={styles.effectPreviewViewport} aria-hidden="true">
							<ProfilePreview
								user={user}
guildId={selectedGuildId}
guildMember={guildMember}
guildMemberProfile={guildMemberProfile}
								previewAvatarUrl={avatarUrl}
								previewBannerUrl={bannerUrl}
								previewBio={effectiveBio}
								previewPronouns={pronouns}
								previewCustomStatus={previewCustomStatus ?? user.customStatus}
								previewGlobalName={displayName}
								previewCustomization={{...rawCustomization, profileEffectId: draftEffect}}
								showPreviewLabel={false}
								showMembershipInfo={false}
								showMessageButton={false}
								compact
								expandedCard
								mobileCompactCard
								mobileEditorSurface
							/>
						</div>
						<div className={styles.effectPreviewCaption} aria-live="polite">
							<strong>{PROFILE_EFFECTS.find((effect) => effect.id === draftEffect)?.name ?? 'لا يوجد'}</strong>
							<span>{draftEffect ? 'معاينة مباشرة للتأثير' : 'لا يوجد تأثير محدد'}</span>
						</div>
						<h3 className={styles.decorationSectionTitle}>تأثيرات الملف الشخصي</h3>
						<div className={`${styles.decorGrid} ${styles.effectPickerGrid}`}>
							<button
								type="button"
								className={styles.decorTile}
								data-selected={draftEffect === null}
								aria-pressed={draftEffect === null}
								aria-label="لا يوجد"
								onClick={() => setDraftEffect(null)}
							>
								<div className={styles.decorTileIcon}>
									<ProhibitIcon size={28} weight="bold" />
								</div>
								<span className={styles.decorTileText}>لا يوجد</span>
							</button>

							{PROFILE_EFFECTS.map((p) => (
								<button
									key={p.id}
									type="button"
									className={styles.decorTile}
									data-selected={draftEffect === p.id}
									aria-pressed={draftEffect === p.id}
									aria-label={p.name}
									title={p.name}
									onClick={() => setDraftEffect(p.id)}
								>
									<div className={styles.decorTileIcon}>
										{p.thumbnail ? (
											<img src={p.thumbnail} alt="" style={{width: 44, height: 44, borderRadius: 6}} />
										) : (
											<SparkleIcon size={26} weight="duotone" />
										)}
									</div>
									<span className={styles.decorTileText}>{p.name}</span>
								</button>
							))}
						</div>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => {
								form.setValue('profile_appearance', {...rawCustomization, profileEffectId: draftEffect}, {shouldDirty: true});
								setActiveScreen('none');
							}}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 6: نافذة تخصيص الاسم الظاهر ================= */}
			{activeScreen === 'nameStyle' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('none')}
					title="تخصيص الاسم الظاهر"
					initialSnap={0.85}
					snapPoints={[0, 0.65, 0.85, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						{/* Preview Card */}
						<div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem', background: '#17181c', borderRadius: 10}}>
							<img src={avatarUrl || ''} alt="" style={{width: 52, height: 52, borderRadius: '50%'}} />
							<div>
								<div style={{fontSize: '1.25rem', fontWeight: 800}}>
									<ProfileDisplayName name={displayName || 'HASOON'} appearance={appearance} />
								</div>
								<small style={{color: '#949ba4'}}>{user.username}#{user.discriminator || '0'}</small>
							</div>
						</div>

						{/* 3 Rows */}
						<button
							type="button"
							className={styles.rowItem}
							onClick={() => setActiveScreen('fontPicker')}
						>
							<div className={styles.rowLeft}>
								<div className={styles.rowTexts}>
									<strong className={styles.rowTitle}>الخط</strong>
									<span className={styles.rowSubtitle}>{currentFont.label}</span>
								</div>
							</div>
							<CaretRightIcon size={18} className={styles.chevronIcon} />
						</button>

						<button
							type="button"
							className={styles.rowItem}
							onClick={() => setActiveScreen('effectPicker')}
						>
							<div className={styles.rowLeft}>
								<div className={styles.rowTexts}>
									<strong className={styles.rowTitle}>التأثير</strong>
									<span className={styles.rowSubtitle}>{currentEffect.label}</span>
								</div>
							</div>
							<CaretRightIcon size={18} className={styles.chevronIcon} />
						</button>

						<button
							type="button"
							className={styles.rowItem}
							onClick={() => setActiveScreen('colorPicker')}
						>
							<div className={styles.rowLeft}>
								<div className={styles.rowTexts}>
									<strong className={styles.rowTitle}>اللون</strong>
									<span className={styles.rowSubtitle}>{currentColor}</span>
								</div>
							</div>
							<div className={styles.rowRight}>
								<span className={styles.colorSwatchSquare} style={{backgroundColor: currentColor}} />
								<CaretRightIcon size={18} className={styles.chevronIcon} />
							</div>
						</button>

						{/* Buttons */}
						<div style={{display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem'}}>
							<button
								type="button"
								className={styles.actionBtnSecondary}
								onClick={() => {
									const randFont = FONT_CHOICES[Math.floor(Math.random() * FONT_CHOICES.length)];
									const randEffect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
									const randColor = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
									updateAppearance({
										nameStyleEnabled: true,
										nameFont: randFont.value,
										nameEffect: randEffect.value,
										nameColorEnabled: true,
										...withNameColors(appearance, randEffect.value, [randColor]),
									});
								}}
							>
								<DiceFiveIcon size={20} weight="bold" />
								<span>🎲 مفاجئني</span>
							</button>

							<button
								type="button"
								className={styles.actionBtnRed}
								onClick={() => {
									updateAppearance({
										nameStyleEnabled: false,
										nameFont: 'nexus',
										nameEffect: 'solid',
									});
									setActiveScreen('none');
								}}
							>
								إزالة التنسيق
							</button>
						</div>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 7: اختيار الخط ================= */}
			{activeScreen === 'fontPicker' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('nameStyle')}
					title="الخط"
					initialSnap={0.85}
					snapPoints={[0, 0.65, 0.85, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<div className={styles.fontGrid}>
							{FONT_CHOICES.map((font) => (
								<button
									key={font.value}
									type="button"
									className={styles.fontTile}
									data-selected={draftFont === font.value}
									onClick={() => setDraftFont(font.value)}
								>
									<span className={styles.fontTileSample} style={{fontFamily: font.family}}>Gg</span>
									<span className={styles.fontTileLabel}>{font.label}</span>
								</button>
							))}
						</div>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => {
								updateAppearance({nameFont: draftFont, nameStyleEnabled: true});
								setActiveScreen('nameStyle');
							}}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 8: اختيار التأثير ================= */}
			{activeScreen === 'effectPicker' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('nameStyle')}
					title="التأثير"
					initialSnap={0.85}
					snapPoints={[0, 0.65, 0.85, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<div className={styles.fontGrid}>
							{EFFECTS.map((eff) => (
								<button
									key={eff.value}
									type="button"
									className={styles.fontTile}
									data-selected={draftEffectType === eff.value}
									onClick={() => setDraftEffectType(eff.value)}
								>
									<span className={styles.fontTileSample} style={{fontSize: '1rem'}}>{eff.label}</span>
								</button>
							))}
						</div>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => {
								updateAppearance({nameEffect: draftEffectType, nameStyleEnabled: true});
								setActiveScreen('nameStyle');
							}}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}

			{/* ================= Screen 9: اختيار اللون ================= */}
			{activeScreen === 'colorPicker' && (
				<BottomSheet
					isOpen={true}
					onClose={() => setActiveScreen('nameStyle')}
					title="اللون"
					initialSnap={0.85}
					snapPoints={[0, 0.65, 0.85, 1]}
					surface="primary"
				>
					<div className={styles.sheetContainer}>
						<div className={styles.colorCirclesGrid}>
							{COLOR_SWATCHES.map((hex) => (
								<button
									key={hex}
									type="button"
									className={styles.colorCircle}
									style={{backgroundColor: hex}}
									data-selected={draftColor.toUpperCase() === hex.toUpperCase()}
									onClick={() => setDraftColor(hex)}
								/>
							))}
						</div>

						<div style={{display: 'flex', gap: '0.65rem'}}>
							<button
								type="button"
								className={styles.actionBtnSecondary}
								style={{flex: 1}}
								onClick={() => setDraftColor('#FFFFFF')}
							>
								الاستخدام الافتراضي
							</button>

							<button
								type="button"
								className={styles.actionBtnSecondary}
								style={{flex: 1}}
								onClick={() => setDraftColor('#FF0000')}
							>
								لون مخصص
							</button>
						</div>

						<button
							type="button"
							className={styles.actionBtnRed}
							onClick={() => {
								updateAppearance({
									nameColorEnabled: true,
									nameStyleEnabled: true,
									...withNameColors(appearance, appearance.nameEffect, [draftColor]),
								});
								setActiveScreen('nameStyle');
							}}
						>
							تحديد
						</button>
					</div>
				</BottomSheet>
			)}
		</div>
	);
});
