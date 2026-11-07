// SPDX-License-Identifier: Nebula

export type TriggerType =
	| 'mention'
	| 'channel'
	| 'emoji'
	| 'emojiReaction'
	| 'command'
	| 'meme'
	| 'gif'
	| 'sticker'
	| 'commandArgMention'
	| 'commandArg';

export function isAutocompleteTriggerAllowed(
	triggerType: TriggerType,
	allowedTriggers: ReadonlyArray<TriggerType> | undefined,
): boolean {
	return allowedTriggers == null || allowedTriggers.includes(triggerType);
}
