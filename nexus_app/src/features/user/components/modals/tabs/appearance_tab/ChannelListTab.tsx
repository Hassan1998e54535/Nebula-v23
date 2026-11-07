// SPDX-License-Identifier: Nebula

import * as AccessibilityCommands from '@app/features/accessibility/commands/AccessibilityCommands';
import Accessibility from '@app/features/accessibility/state/Accessibility';
import {Switch} from '@app/features/ui/components/form/FormSwitch';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';

const SHOW_UNREAD_INDICATOR_ON_MUTED_CHANNELS_DESCRIPTOR = msg({
	message: 'Show unread indicator on muted channels',
	comment: 'Label in the channel list tab.',
});
const MUTED_CHANNELS_UNREAD_INDICATOR_HELP_DESCRIPTOR = msg({
	message:
		'When enabled, muted channels show a faded unread indicator on the left side. Mentions still appear regardless of this setting.',
	comment: 'Description for the muted-channel unread indicator setting.',
});
export const ChannelListTabContent: React.FC = observer(() => {
	const {i18n} = useLingui();
	return (
		<Switch
			label={i18n._(SHOW_UNREAD_INDICATOR_ON_MUTED_CHANNELS_DESCRIPTOR)}
			description={i18n._(MUTED_CHANNELS_UNREAD_INDICATOR_HELP_DESCRIPTOR)}
			value={Accessibility.showFadedUnreadOnMutedChannels}
			onChange={(value) => AccessibilityCommands.update({showFadedUnreadOnMutedChannels: value})}
			data-flx="user.appearance-tab.channel-list-tab.channel-list-tab-content.switch.update"
		/>
	);
});
