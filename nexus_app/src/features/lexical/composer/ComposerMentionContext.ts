// SPDX-License-Identifier: Nebula

import {createContext} from 'react';

export interface ComposerMentionContextValue {
	guildId?: string;
	channelId?: string;
	plainText: boolean;
}

export const ComposerMentionContext = createContext<ComposerMentionContextValue>({plainText: false});
