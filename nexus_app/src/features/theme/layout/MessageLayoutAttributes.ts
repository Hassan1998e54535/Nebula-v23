// SPDX-License-Identifier: Nebula

export const COMPACT_MARKDOWN_ATTRIBUTE = 'data-compact-markdown';
export const COMPACT_MESSAGE_PREFIX_ATTRIBUTE = 'data-compact-message-prefix';

export function compactMarkdownProps(): {[COMPACT_MARKDOWN_ATTRIBUTE]: 'true'} {
	return {[COMPACT_MARKDOWN_ATTRIBUTE]: 'true'};
}

export function compactMessagePrefixProps(): {[COMPACT_MESSAGE_PREFIX_ATTRIBUTE]: 'true'} {
	return {[COMPACT_MESSAGE_PREFIX_ATTRIBUTE]: 'true'};
}
