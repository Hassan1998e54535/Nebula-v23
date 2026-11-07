// SPDX-License-Identifier: Nebula

import * as AccessibilityCommands from '@app/features/accessibility/commands/AccessibilityCommands';
import Accessibility, {ChannelTypingIndicatorMode} from '@app/features/accessibility/state/Accessibility';
import {SettingsTabSection} from '@app/features/app/components/dialogs/shared/SettingsTabLayout';
import {ChannelItemCore} from '@app/features/app/components/layout/ChannelItem';
import channelItemSurfaceStyles from '@app/features/app/components/layout/ChannelItemSurface.module.css';
import {Typing} from '@app/features/channel/components/ChannelTyping';
import {AvatarStack} from '@app/features/ui/avatars/AvatarStack';
import {Switch} from '@app/features/ui/components/form/FormSwitch';
import {MockAvatar} from '@app/features/ui/components/MockAvatar';
import type {RadioOption} from '@app/features/ui/radio_group/RadioGroup';
import {RadioGroup} from '@app/features/ui/radio_group/RadioGroup';
import MobileLayout from '@app/features/ui/state/MobileLayout';
import SidebarPreferences from '@app/features/ui/state/SidebarPreferences';
import {Tooltip} from '@app/features/ui/tooltip/Tooltip';
import styles from '@app/features/user/components/modals/tabs/appearance_tab/InterfaceTab.module.css';
import {getDefaultAvatarURLForIndex} from '@app/features/user/utils/AvatarUtils';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import type React from 'react';

const TYPING_INDICATOR_AVATARS_DESCRIPTOR = msg({
	message: 'Typing indicator + avatars',
	comment: 'Label in the interface tab.',
});
const SHOW_TYPING_INDICATOR_WITH_USER_AVATARS_IN_THE_DESCRIPTOR = msg({
	message: 'Show typing indicator with user avatars in the channel list',
	comment: 'Label in the interface tab.',
});
const TYPING_INDICATOR_ONLY_DESCRIPTOR = msg({
	message: 'Typing indicator only',
	comment: 'Short label in the interface tab. Keep it concise.',
});
const SHOW_JUST_THE_TYPING_INDICATOR_WITHOUT_AVATARS_DESCRIPTOR = msg({
	message: 'Show just the typing indicator without avatars',
	comment: 'Label in the interface tab.',
});
const HIDDEN_DESCRIPTOR = msg({
	message: 'Hidden',
	comment: 'Short label in the interface tab. Keep it concise.',
});
const DON_T_SHOW_TYPING_INDICATORS_IN_THE_CHANNEL_DESCRIPTOR = msg({
	message: "Don't show typing indicators in the channel list",
	comment: 'Label in the interface tab.',
});
const CHANNEL_LIST_TYPING_INDICATORS_DESCRIPTOR = msg({
	message: 'Channel list typing indicators',
	comment: 'Label in the interface tab.',
});
const CHANNEL_LIST_TYPING_INDICATOR_MODE_DESCRIPTOR = msg({
	message: 'Channel list typing indicator mode',
	comment: 'Label in the interface tab.',
});
const SELECTED_CHANNEL_DESCRIPTOR = msg({
	message: 'Selected channel',
	comment: 'Settings section title for typing indicator behavior on the active channel.',
});
const SHOW_TYPING_ON_SELECTED_CHANNEL_DESCRIPTOR = msg({
	message: 'Show typing on the selected channel',
	comment: 'Toggle label in the interface settings.',
});
const SELECTED_CHANNEL_TYPING_HELP_DESCRIPTOR = msg({
	message: "When enabled, the channel list can show typing activity for the channel you're viewing.",
	comment: 'Description for the selected-channel typing indicator setting.',
});
const GUILD_SIDEBAR_DESCRIPTOR = msg({
	message: 'Guild sidebar',
	comment: 'Settings section title for community and direct-message sidebar behavior.',
});
const COLLAPSE_INLINE_DMS_DESCRIPTOR = msg({
	message: 'Collapse DMs into folder',
	comment: 'Toggle label for collapsing the direct-message list in the sidebar.',
});
const COLLAPSE_INLINE_DMS_HELP_DESCRIPTOR = msg({
	message:
		'When enabled, direct messages collapse into the NEXUS button. On mobile, tap NEXUS while on the DMs page; on desktop, use its menu to expand or collapse the folder.',
	comment: 'Description for collapsing direct messages in the sidebar.',
});
const KEYBOARD_HINTS_DESCRIPTOR = msg({
	message: 'Keyboard hints',
	comment: 'Settings section title for keyboard shortcut hints in tooltips.',
});
const HIDE_KEYBOARD_HINTS_DESCRIPTOR = msg({
	message: 'Hide keyboard hints in tooltips',
	comment: 'Toggle label for hiding keyboard shortcuts in tooltips.',
});
const KEYBOARD_HINTS_HELP_DESCRIPTOR = msg({
	message: 'Keyboard shortcut hints in tooltips',
	comment: 'Description for the keyboard hints setting.',
});
const OPEN_COMMUNITIES_TO_LAST_CHANNEL_DESCRIPTOR = msg({
	message: 'Open communities to your last channel',
	comment: 'Toggle label for opening a community at the last channel visited on mobile.',
});
const OPEN_COMMUNITIES_TO_LAST_CHANNEL_HELP_DESCRIPTOR = msg({
	message:
		'When enabled, tapping a community takes you straight to the last channel you viewed there. Swipe right to see its channel list.',
	comment: 'Description for opening communities at the last channel visited on mobile.',
});
const ChannelListPreview = observer(({mode}: {mode: ChannelTypingIndicatorMode}) => {
	const typingIndicator =
		mode !== ChannelTypingIndicatorMode.HIDDEN ? (
			<Tooltip
				text={() => (
					<span
						className={styles.tooltipContent}
						data-flx="user.appearance-tab.interface-tab.channel-list-preview.tooltip-content"
					>
						<Trans>
							<strong data-flx="user.appearance-tab.interface-tab.channel-list-preview.strong">Kenji</strong>,{' '}
							<strong data-flx="user.appearance-tab.interface-tab.channel-list-preview.strong--2">Amara</strong> and{' '}
							<strong data-flx="user.appearance-tab.interface-tab.channel-list-preview.strong--3">Mateo</strong> are
							typing...
						</Trans>
					</span>
				)}
				data-flx="user.appearance-tab.interface-tab.channel-list-preview.tooltip"
			>
				<div
					className={styles.typingContainer}
					data-flx="user.appearance-tab.interface-tab.channel-list-preview.typing-container"
				>
					<Typing
						className={styles.typingAnimationWrapper}
						size={20}
						color="var(--surface-interactive-selected-color)"
						data-flx="user.appearance-tab.interface-tab.channel-list-preview.typing-animation-wrapper"
					/>
					{mode === ChannelTypingIndicatorMode.AVATARS && (
						<AvatarStack
							size={12}
							maxVisible={5}
							className={styles.typingAvatars}
							data-flx="user.appearance-tab.interface-tab.channel-list-preview.typing-avatars"
						>
							{[1, 2, 3].map((index) => (
								<MockAvatar
									key={index}
									size={12}
									userTag={`User ${index}`}
									avatarUrl={getDefaultAvatarURLForIndex(index)}
									data-flx="user.appearance-tab.interface-tab.channel-list-preview.mock-avatar"
								/>
							))}
						</AvatarStack>
					)}
				</div>
			</Tooltip>
		) : undefined;
	return (
		<div
			className={styles.previewContainer}
			data-flx="user.appearance-tab.interface-tab.channel-list-preview.preview-container"
		>
			<div
				className={styles.previewContent}
				data-flx="user.appearance-tab.interface-tab.channel-list-preview.preview-content"
			>
				<ChannelItemCore
					channel={{name: 'general', type: 0}}
					forceHover
					typingIndicator={typingIndicator}
					className={clsx('cursor-default', channelItemSurfaceStyles.channelItemSurface)}
					data-flx="user.appearance-tab.interface-tab.channel-list-preview.cursor-default"
				/>
			</div>
		</div>
	);
});
export const InterfaceTabContent: React.FC = observer(() => {
	const {i18n} = useLingui();
	const channelTypingIndicatorOptions: ReadonlyArray<RadioOption<ChannelTypingIndicatorMode>> = [
		{
			value: ChannelTypingIndicatorMode.AVATARS,
			name: i18n._(TYPING_INDICATOR_AVATARS_DESCRIPTOR),
			desc: i18n._(SHOW_TYPING_INDICATOR_WITH_USER_AVATARS_IN_THE_DESCRIPTOR),
		},
		{
			value: ChannelTypingIndicatorMode.INDICATOR_ONLY,
			name: i18n._(TYPING_INDICATOR_ONLY_DESCRIPTOR),
			desc: i18n._(SHOW_JUST_THE_TYPING_INDICATOR_WITHOUT_AVATARS_DESCRIPTOR),
		},
		{
			value: ChannelTypingIndicatorMode.HIDDEN,
			name: i18n._(HIDDEN_DESCRIPTOR),
			desc: i18n._(DON_T_SHOW_TYPING_INDICATORS_IN_THE_CHANNEL_DESCRIPTOR),
		},
	];
	return (
		<>
			<SettingsTabSection
				title={i18n._(CHANNEL_LIST_TYPING_INDICATORS_DESCRIPTOR)}
				data-flx="user.appearance-tab.interface-tab.interface-tab-content.settings-tab-section"
			>
				<ChannelListPreview
					mode={Accessibility.channelTypingIndicatorMode}
					data-flx="user.appearance-tab.interface-tab.interface-tab-content.channel-list-preview"
				/>
				<RadioGroup
					options={channelTypingIndicatorOptions}
					value={Accessibility.channelTypingIndicatorMode}
					onChange={(value) => AccessibilityCommands.update({channelTypingIndicatorMode: value})}
					aria-label={i18n._(CHANNEL_LIST_TYPING_INDICATOR_MODE_DESCRIPTOR)}
					data-flx="user.appearance-tab.interface-tab.interface-tab-content.radio-group.update"
				/>
			</SettingsTabSection>
			<SettingsTabSection
				title={i18n._(SELECTED_CHANNEL_DESCRIPTOR)}
				data-flx="user.appearance-tab.interface-tab.selected-channel-typing.settings-tab-section"
			>
				<p className={styles.selectedChannelTypingDescription}>{i18n._(SELECTED_CHANNEL_TYPING_HELP_DESCRIPTOR)}</p>
				<Switch
					label={i18n._(SHOW_TYPING_ON_SELECTED_CHANNEL_DESCRIPTOR)}
					value={SidebarPreferences.showTypingOnSelectedChannel}
					onChange={SidebarPreferences.setShowTypingOnSelectedChannel}
					data-flx="user.appearance-tab.interface-tab.selected-channel-typing.switch"
				/>
			</SettingsTabSection>
			<SettingsTabSection
				title={i18n._(KEYBOARD_HINTS_DESCRIPTOR)}
				data-flx="user.appearance-tab.interface-tab.keyboard-hints.settings-tab-section"
			>
				<Switch
					label={i18n._(HIDE_KEYBOARD_HINTS_DESCRIPTOR)}
					description={i18n._(KEYBOARD_HINTS_HELP_DESCRIPTOR)}
					value={Accessibility.hideKeyboardHints}
					onChange={(value) => AccessibilityCommands.update({hideKeyboardHints: value})}
					data-flx="user.appearance-tab.interface-tab.keyboard-hints.switch"
				/>
			</SettingsTabSection>
			<SettingsTabSection
				title={i18n._(GUILD_SIDEBAR_DESCRIPTOR)}
				data-flx="user.appearance-tab.interface-tab.guild-sidebar.settings-tab-section"
			>
				<p className={styles.selectedChannelTypingDescription}>{i18n._(COLLAPSE_INLINE_DMS_HELP_DESCRIPTOR)}</p>
				<Switch
					label={i18n._(COLLAPSE_INLINE_DMS_DESCRIPTOR)}
					value={SidebarPreferences.inlineDmsCollapsed}
					onChange={SidebarPreferences.setInlineDmsCollapsed}
					data-flx="user.appearance-tab.interface-tab.guild-sidebar.collapse-inline-dms.switch"
				/>
				{MobileLayout.enabled ? (
					<Switch
						label={i18n._(OPEN_COMMUNITIES_TO_LAST_CHANNEL_DESCRIPTOR)}
						description={i18n._(OPEN_COMMUNITIES_TO_LAST_CHANNEL_HELP_DESCRIPTOR)}
						value={SidebarPreferences.openGuildsToLastChannel}
						onChange={SidebarPreferences.setOpenGuildsToLastChannel}
						data-flx="user.appearance-tab.interface-tab.guild-sidebar.open-last-channel.switch"
					/>
				) : null}
			</SettingsTabSection>
		</>
	);
});
