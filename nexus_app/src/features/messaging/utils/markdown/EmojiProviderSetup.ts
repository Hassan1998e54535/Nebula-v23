// SPDX-License-Identifier: Nebula

import UnicodeEmojis from '@app/features/expressions/utils/UnicodeEmojis';
import {type EmojiProvider, setEmojiParserConfig} from '@app/features/messaging/utils/markdown/parser/EmojiParsers';
import {SKIN_TONE_SURROGATES} from '@nexus/constants/src/EmojiConstants';

const emojiProvider: EmojiProvider = {
	matchEmojiSurrogates: UnicodeEmojis.matchEmojiSurrogates,
	findEmojiByName: UnicodeEmojis.findEmojiByShortcodeName,
	findEmojiWithSkinTone: UnicodeEmojis.findEmojiWithSkinTone,
};

export function initializeEmojiParser(): void {
	setEmojiParserConfig({
		emojiProvider,
		skinToneSurrogates: SKIN_TONE_SURROGATES,
	});
}
