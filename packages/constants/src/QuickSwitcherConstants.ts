// SPDX-License-Identifier: Nebula

import type {ValueOf} from '@nexus/constants/src/ValueOf';

export const QuickSwitcherResultTypes = {
	HEADER: 'header',
	USER: 'user',
	GROUP_DM: 'group_dm',
	TEXT_CHANNEL: 'text_channel',
	VOICE_CHANNEL: 'voice_channel',
	GUILD: 'guild',
	VIRTUAL_GUILD: 'virtual_guild',
	SETTINGS: 'settings',
	LINK: 'link',
} as const;

export type QuickSwitcherResultType = ValueOf<typeof QuickSwitcherResultTypes>;
