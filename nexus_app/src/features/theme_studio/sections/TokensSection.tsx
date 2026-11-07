// SPDX-License-Identifier: Nebula

import * as AccessibilityCommands from '@app/features/accessibility/commands/AccessibilityCommands';
import Accessibility from '@app/features/accessibility/state/Accessibility';
import {ShareThemeModal} from '@app/features/theme/components/modals/ShareThemeModal';
import {remFromPx} from '@app/features/theme/layout/RemFromPx';
import ThemeLibrary from '@app/features/theme/state/ThemeLibrary';
import {
	DEFAULT_EXPANDED_GROUP_IDS,
	getTokenGroupLabelDescriptor,
	getTokenVariableDefinition,
	humanizeVariableName,
	TOKEN_GROUPS,
	type TokenGroupDefinition,
} from '@app/features/theme_studio/sections/TokenGroups';
import styles from '@app/features/theme_studio/sections/TokensSection.module.css';
import {broadcastThemeStudioMessage} from '@app/features/theme_studio/state/ThemeStudioBroadcast';
import ThemeStudioState from '@app/features/theme_studio/state/ThemeStudioState';
import {StudioButton} from '@app/features/theme_studio/ui/StudioButton';
import {StudioEmptyState} from '@app/features/theme_studio/ui/StudioEmptyState';
import {StudioSearchInput} from '@app/features/theme_studio/ui/StudioSearchInput';
import {StudioSection} from '@app/features/theme_studio/ui/StudioSection';
import {StudioTokenColor, StudioTokenFont, StudioTokenValue} from '@app/features/theme_studio/ui/StudioToken';
import {showThemeStudioErrorModal} from '@app/features/theme_studio/utils/ThemeStudioErrorModalUtils';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import * as ToastCommands from '@app/features/ui/commands/ToastCommands';
import {Switch} from '@app/features/ui/components/form/FormSwitch';
import {
	extractThemeVariableOverrides,
	updateCssForVariable,
} from '@app/features/user/components/modals/tabs/appearance_tab/theme/ThemeUtils';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Plural, Trans, useLingui} from '@lingui/react/macro';
import {ArrowCounterClockwiseIcon, ShareNetworkIcon} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useEffect, useMemo} from 'react';

const TOKEN_OVERRIDES_CLEARED_DESCRIPTOR = msg({
	message: 'Token overrides cleared.',
	comment: 'Short label in the theme studio tokens section. Keep it concise. Keep the tone plain and specific.',
});
const YOU_DON_T_HAVE_ANY_CUSTOM_THEME_OVERRIDES_DESCRIPTOR = msg({
	message: "You don't have any custom theme overrides to share yet.",
	comment: 'Description text in the theme studio tokens section. Keep the tone plain and specific.',
});
const SEARCH_TOKENS_DESCRIPTOR = msg({
	message: 'Search tokens…',
	comment:
		'Button or menu action label in the theme studio tokens section. Keep it concise. Keep the tone plain and specific.',
});
const NO_TOKENS_MATCH_DESCRIPTOR = msg({
	message: 'No tokens match "{searchQuery}".',
	comment: 'Empty search result title in Theme Studio token search.',
});
const TRY_A_DIFFERENT_VARIABLE_NAME_OR_CLEAR_THE_DESCRIPTOR = msg({
	message: 'Try a different variable name or clear the search.',
	comment: 'Accessible label in the theme studio tokens section. Keep it concise. Keep the tone plain and specific.',
});
const THEME_STUDIO_SYNC_DESCRIPTOR = msg({
	message: 'Theme Studio sync',
	comment: 'Heading for the directional theme color sync settings.',
});
const USE_COLORS_FROM_THEME_STUDIO_DESCRIPTOR = msg({
	message: 'Use colors from Theme Studio',
	comment: 'Label for applying remote Theme Studio color changes on this device.',
});
const USE_COLORS_FROM_THEME_STUDIO_DESCRIPTION_DESCRIPTOR = msg({
	message:
		'When enabled, color changes from Theme Studio on desktop apply on this device. When disabled, this device keeps its own colors.',
	comment: 'Description for applying remote Theme Studio color changes on this device.',
});
const SEND_COLOR_CHANGES_TO_THEME_STUDIO_DESCRIPTOR = msg({
	message: 'Send color changes to Theme Studio',
	comment: 'Label for sending this device’s color changes to other devices.',
});
const SEND_COLOR_CHANGES_TO_THEME_STUDIO_DESCRIPTION_DESCRIPTOR = msg({
	message:
		'When enabled, colors you change here sync to Theme Studio on your other devices. When disabled, desktop Theme Studio keeps its own colors.',
	comment: 'Description for sending this device’s color changes to other devices.',
});
const THEME_PREVIEW_DESCRIPTOR = msg({
	message: 'Theme preview',
	comment: 'Heading for the live chat preview in the theme color editor.',
});
const NEXUS_COMMUNITY_PREVIEW_DESCRIPTOR = msg({
	message: 'NEXUS community preview',
	comment: 'Accessible label for the community sidebar in the theme color preview.',
});
const CHAT_PREVIEW_DESCRIPTOR = msg({
	message: 'Chat preview',
	comment: 'Accessible label for the chat area in the theme color preview.',
});
const PREVIEW_MEMBER_DESCRIPTOR = msg({
	message: 'NEXUS member',
	comment: 'Sample author name in the theme color preview.',
});
const PREVIEW_MESSAGE_DESCRIPTOR = msg({
	message: 'See how your color choices look in chat.',
	comment: 'Sample message in the theme color preview.',
});
const PREVIEW_COMPOSER_DESCRIPTOR = msg({
	message: 'Message #general',
	comment: 'Placeholder in the theme color preview.',
});
const ESSENTIAL_COLORS_DESCRIPTOR = msg({message: 'Essential colors'});
const BRAND_AND_BUTTONS_DESCRIPTOR = msg({message: 'Brand & buttons'});
const CHAT_AND_MESSAGES_DESCRIPTOR = msg({message: 'Chat & messages'});
const SIDEBARS_AND_NAVIGATION_DESCRIPTOR = msg({message: 'Sidebars & navigation'});
const TEXT_COLORS_DESCRIPTOR = msg({message: 'Text'});
const HEADERS_DESCRIPTOR = msg({message: 'Headers'});
const STATUS_DESCRIPTOR = msg({message: 'Status'});
const EMBEDS_AND_MENTIONS_DESCRIPTOR = msg({message: 'Embeds & mentions'});
const ACCENTS_AND_ALERTS_DESCRIPTOR = msg({message: 'Accents & alerts'});
const SURFACES_AND_CONTROLS_DESCRIPTOR = msg({message: 'Surfaces & controls'});

interface TokensSectionProps {
	defaultVariableValues: Readonly<Record<string, string>>;
	appearanceMode?: boolean;
}

export const TokensSection: React.FC<TokensSectionProps> = observer((props) => {
	const {defaultVariableValues, appearanceMode = false} = props;
	const {i18n} = useLingui();
	const customThemeCss = Accessibility.customThemeCss ?? '';
	const overrides = useMemo(() => extractThemeVariableOverrides(customThemeCss), [customThemeCss]);
	const searchQuery = appearanceMode ? '' : ThemeStudioState.tokenSearch.trim().toLowerCase();
	useEffect(() => {
		if (appearanceMode) {
			ThemeStudioState.toggleGroup('essential-colors', true);
			return;
		}
		if (!ThemeStudioState.hasInitializedExpansion) {
			ThemeStudioState.expandAllGroups(DEFAULT_EXPANDED_GROUP_IDS);
		}
	}, [appearanceMode]);
	const handleVariableChange = (variableName: string, nextValue: string | null) => {
		const updated =
			nextValue === null
				? updateCssForVariable(customThemeCss, variableName, null)
				: updateCssForVariable(customThemeCss, variableName, nextValue);
		AccessibilityCommands.update({customThemeCss: updated.length === 0 ? null : updated});
		broadcastThemeStudioMessage({type: 'customThemeCss', value: updated.length === 0 ? null : updated});
	};
	const overrideCount = Object.keys(overrides).length;
	const tokenGroupCount = TOKEN_GROUPS.length;
	const tokenCount = TOKEN_GROUPS.reduce((count, group) => count + group.variables.length, 0);
	const handleResetAll = () => {
		if (overrideCount === 0) return;
		AccessibilityCommands.update({customThemeCss: null});
		broadcastThemeStudioMessage({type: 'customThemeCss', value: null});
		ToastCommands.success(i18n._(TOKEN_OVERRIDES_CLEARED_DESCRIPTOR));
	};
	const handleShare = () => {
		const css = [ThemeLibrary.activeThemeCss, customThemeCss]
			.map((value) => value.trim())
			.filter(Boolean)
			.join('\n\n');
		if (!css.trim()) {
			showThemeStudioErrorModal(
				i18n,
				() => i18n._(YOU_DON_T_HAVE_ANY_CUSTOM_THEME_OVERRIDES_DESCRIPTOR),
				'theme-studio.tokens-section.share-empty-error-modal',
			);
			return;
		}
		ModalCommands.push(
			modal(() => (
				<ShareThemeModal themeCss={css} data-flx="theme-studio.tokens-section.handle-share.share-theme-modal" />
			)),
		);
	};
	const groups = useMemo(() => {
		if (appearanceMode) {
			const colorVariables = TOKEN_GROUPS.flatMap((group) => group.variables).filter(
				(variable) => getTokenVariableDefinition(variable)?.kind === 'color',
			);
			const variablesByGroup = new Map(TOKEN_GROUPS.map((group) => [group.id, group.variables]));
			const used = new Set<string>();
			const appearanceGroups: Array<{group: TokenGroupDefinition; vars: Array<string>}> = [];
			const addGroup = (id: string, descriptor: MessageDescriptor, variables: Array<string>) => {
				const vars = variables.filter((variable) => !used.has(variable));
				if (vars.length === 0) return;
				vars.forEach((variable) => used.add(variable));
				appearanceGroups.push({
					group: {id, fallbackLabel: i18n._(descriptor), variables: vars},
					vars,
				});
			};
			const fromSourceGroups = (groupIds: Array<string>) =>
				groupIds
					.flatMap((groupId) => variablesByGroup.get(groupId) ?? [])
					.filter((variable) => colorVariables.includes(variable));

			addGroup(
				'essential-colors',
				ESSENTIAL_COLORS_DESCRIPTOR,
				['--brand-primary', '--background-primary', '--background-secondary', '--text-primary', '--text-chat'].filter(
					(variable) => colorVariables.includes(variable),
				),
			);
			addGroup('brand-buttons', BRAND_AND_BUTTONS_DESCRIPTOR, fromSourceGroups(['brand', 'buttons']));
			addGroup('chat-messages', CHAT_AND_MESSAGES_DESCRIPTOR, fromSourceGroups(['messages']));
			addGroup('sidebars-navigation', SIDEBARS_AND_NAVIGATION_DESCRIPTOR, fromSourceGroups(['layout']));
			addGroup('text-colors', TEXT_COLORS_DESCRIPTOR, fromSourceGroups(['typography', 'text', 'code']));
			addGroup(
				'headers-colors',
				HEADERS_DESCRIPTOR,
				colorVariables.filter((variable) => variable.includes('header')),
			);
			addGroup('status-colors', STATUS_DESCRIPTOR, fromSourceGroups(['status']));
			addGroup('embeds-mentions', EMBEDS_AND_MENTIONS_DESCRIPTOR, fromSourceGroups(['markup', 'tables']));
			addGroup('accents-alerts', ACCENTS_AND_ALERTS_DESCRIPTOR, fromSourceGroups(['alerts', 'borders']));
			addGroup(
				'surfaces-controls',
				SURFACES_AND_CONTROLS_DESCRIPTOR,
				colorVariables.filter((variable) => !used.has(variable)),
			);
			return appearanceGroups;
		}
		if (searchQuery.length === 0) {
			return TOKEN_GROUPS.map((group) => ({group, vars: [...group.variables]}));
		}
		return TOKEN_GROUPS.map((group) => {
			const vars = group.variables.filter((variable) => {
				const human = humanizeVariableName(variable);
				const definition = getTokenVariableDefinition(variable);
				return [variable, human, definition?.groupLabel, definition?.source, definition?.kind].some(
					(value) => value?.toLowerCase().includes(searchQuery) ?? false,
				);
			});
			return {group, vars};
		}).filter((entry) => entry.vars.length > 0);
	}, [appearanceMode, i18n, searchQuery]);
	const noResults = groups.length === 0;
	return (
		<div className={styles.section} data-flx="theme-studio.tokens-section.section">
			<div className={styles.syncGroup} data-flx="theme-studio.tokens-section.theme-studio-sync">
				<h2 className={styles.syncHeading}>{i18n._(THEME_STUDIO_SYNC_DESCRIPTOR)}</h2>
				<div className={styles.syncCard}>
					<div className={styles.syncRow}>
						<Switch
							label={i18n._(USE_COLORS_FROM_THEME_STUDIO_DESCRIPTOR)}
							description={i18n._(USE_COLORS_FROM_THEME_STUDIO_DESCRIPTION_DESCRIPTOR)}
							value={Accessibility.customThemeCssUseFromThemeStudio}
							onChange={(value) => Accessibility.setCustomThemeCssUseFromThemeStudio(value)}
							data-flx="theme-studio.tokens-section.switch.use-colors-from-theme-studio"
						/>
					</div>
					<div className={styles.syncRow}>
						<Switch
							label={i18n._(SEND_COLOR_CHANGES_TO_THEME_STUDIO_DESCRIPTOR)}
							description={i18n._(SEND_COLOR_CHANGES_TO_THEME_STUDIO_DESCRIPTION_DESCRIPTOR)}
							value={Accessibility.customThemeCssSendToThemeStudio}
							onChange={(value) => Accessibility.setCustomThemeCssSendToThemeStudio(value)}
							data-flx="theme-studio.tokens-section.switch.send-colors-to-theme-studio"
						/>
					</div>
				</div>
			</div>
			<div className={styles.previewGroup} data-flx="theme-studio.tokens-section.preview">
				<h2 className={styles.previewHeading}>{i18n._(THEME_PREVIEW_DESCRIPTOR)}</h2>
				<div className={styles.previewCard}>
					<aside className={styles.previewSidebar} aria-label={i18n._(NEXUS_COMMUNITY_PREVIEW_DESCRIPTOR)}>
						<div className={styles.previewBrand}>N</div>
						<strong className={styles.previewCommunity}>NEXUS</strong>
						<div className={styles.previewChannelActive}>
							<span aria-hidden="true">#</span>
							<span>general</span>
						</div>
						<div className={styles.previewChannel}>
							<span aria-hidden="true">#</span>
							<span>community</span>
						</div>
					</aside>
					<section className={styles.previewChat} aria-label={i18n._(CHAT_PREVIEW_DESCRIPTOR)}>
						<header className={styles.previewChannelHeader}>
							<span aria-hidden="true">#</span>
							<strong>general</strong>
						</header>
						<div className={styles.previewMessage}>
							<div className={styles.previewAvatar}>N</div>
							<div className={styles.previewMessageBody}>
								<div className={styles.previewAuthorLine}>
									<strong>{i18n._(PREVIEW_MEMBER_DESCRIPTOR)}</strong>
									<span>12:00</span>
								</div>
								<p>{i18n._(PREVIEW_MESSAGE_DESCRIPTOR)}</p>
							</div>
						</div>
						<div className={styles.previewComposer}>
							<span>{i18n._(PREVIEW_COMPOSER_DESCRIPTOR)}</span>
							<span className={styles.previewSendButton} aria-hidden="true">
								↑
							</span>
						</div>
					</section>
				</div>
			</div>
			{!appearanceMode ? (
				<>
					<div className={styles.toolbar} data-flx="theme-studio.tokens-section.toolbar">
						<div className={styles.searchWrap} data-flx="theme-studio.tokens-section.search-wrap">
							<StudioSearchInput
								value={ThemeStudioState.tokenSearch}
								onChange={(value) => ThemeStudioState.setTokenSearch(value)}
								placeholder={i18n._(SEARCH_TOKENS_DESCRIPTOR)}
								data-flx="theme-studio.tokens-section.studio-search-input.set-token-search"
							/>
						</div>
						<div className={styles.toolbarActions} data-flx="theme-studio.tokens-section.toolbar-actions">
							<StudioButton
								variant="secondary"
								compact
								leadingIcon={
									<ArrowCounterClockwiseIcon
										size={remFromPx(13)}
										weight="bold"
										data-flx="theme-studio.tokens-section.arrow-counter-clockwise-icon"
									/>
								}
								disabled={overrideCount === 0}
								onClick={handleResetAll}
								data-flx="theme-studio.tokens-section.studio-button.reset-all"
							>
								<Trans>Reset all</Trans>
							</StudioButton>
							<StudioButton
								variant="primary"
								compact
								leadingIcon={
									<ShareNetworkIcon
										size={remFromPx(13)}
										weight="bold"
										data-flx="theme-studio.tokens-section.share-network-icon"
									/>
								}
								onClick={handleShare}
								data-flx="theme-studio.tokens-section.studio-button.share"
							>
								<Trans>Share active theme</Trans>
							</StudioButton>
						</div>
					</div>
					<div className={styles.summary} data-flx="theme-studio.tokens-section.summary">
						<span data-flx="theme-studio.tokens-section.span">
							<Plural
								value={overrideCount}
								one="# override"
								other="# overrides"
								data-flx="theme-studio.tokens-section.plural"
							/>
						</span>
						<span data-flx="theme-studio.tokens-section.span--2">
							<Plural
								value={tokenGroupCount}
								one="# group"
								other="# groups"
								data-flx="theme-studio.tokens-section.plural--2"
							/>
						</span>
						<span data-flx="theme-studio.tokens-section.span--3">
							<Plural
								value={tokenCount}
								one="# token"
								other="# tokens"
								data-flx="theme-studio.tokens-section.plural--3"
							/>
						</span>
					</div>
				</>
			) : null}
			<div className={styles.body} data-flx="theme-studio.tokens-section.body">
				{noResults ? (
					<div className={styles.searchEmpty} data-flx="theme-studio.tokens-section.search-empty">
						<StudioEmptyState
							title={i18n._(NO_TOKENS_MATCH_DESCRIPTOR, {searchQuery: ThemeStudioState.tokenSearch})}
							description={i18n._(TRY_A_DIFFERENT_VARIABLE_NAME_OR_CLEAR_THE_DESCRIPTOR)}
							actions={
								<StudioButton
									variant="secondary"
									compact
									onClick={() => ThemeStudioState.setTokenSearch('')}
									data-flx="theme-studio.tokens-section.studio-button.set-token-search"
								>
									<Trans>Clear search</Trans>
								</StudioButton>
							}
							data-flx="theme-studio.tokens-section.studio-empty-state"
						/>
					</div>
				) : (
					groups.map(({group, vars}) => {
						const isOpen = searchQuery.length > 0 || ThemeStudioState.isGroupExpanded(group.id);
						const groupLabelDescriptor = getTokenGroupLabelDescriptor(group.id);
						return (
							<StudioSection
								key={group.id}
								title={groupLabelDescriptor == null ? group.fallbackLabel : i18n._(groupLabelDescriptor)}
								count={appearanceMode ? undefined : vars.length}
								open={isOpen}
								onToggle={(next) => {
									if (searchQuery.length > 0) return;
									ThemeStudioState.toggleGroup(group.id, next);
								}}
								data-flx="theme-studio.tokens-section.studio-section"
							>
								{vars.map((variableName) => {
									const definition = getTokenVariableDefinition(variableName);
									const overrideValue = overrides[variableName] ?? '';
									const defaultValue = defaultVariableValues[variableName] ?? '';
									const label = humanizeVariableName(variableName);
									const overridden = overrideValue.length > 0;
									if (definition?.kind === 'font') {
										return (
											<StudioTokenFont
												key={variableName}
												variableName={variableName}
												label={label}
												currentValue={overrideValue}
												defaultValue={defaultValue}
												overridden={overridden}
												onChange={(next) => handleVariableChange(variableName, next)}
												data-flx="theme-studio.tokens-section.studio-token-font.variable-change"
											/>
										);
									}
									if (definition?.kind !== 'color') {
										return (
											<StudioTokenValue
												key={variableName}
												variableName={variableName}
												label={label}
												kind={definition?.kind ?? 'other'}
												currentValue={overrideValue}
												defaultValue={defaultValue}
												overridden={overridden}
												onChange={(next) => handleVariableChange(variableName, next)}
												data-flx="theme-studio.tokens-section.studio-token-value.variable-change"
											/>
										);
									}
									return (
										<StudioTokenColor
											key={variableName}
											variableName={variableName}
											label={label}
											currentValue={overrideValue || defaultValue}
											defaultValue={defaultValue}
											overridden={overridden}
											onChange={(next) => handleVariableChange(variableName, next)}
											data-flx="theme-studio.tokens-section.studio-token-color.variable-change"
										/>
									);
								})}
							</StudioSection>
						);
					})
				)}
			</div>
		</div>
	);
});
