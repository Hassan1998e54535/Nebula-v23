// SPDX-License-Identifier: Nebula

import type {Message as WireMessage} from '@nexus/schema/src/domains/message/MessageResponseSchemas';

export const BackgroundMentionCountMode = Object.freeze({
	MERGE: 'merge',
	REPLACE: 'replace',
} as const);

export type BackgroundMentionCountMode = (typeof BackgroundMentionCountMode)[keyof typeof BackgroundMentionCountMode];

export type ObserveMentionCounts = (
	mentionCounts: ReadonlyMap<string, number>,
	mode: BackgroundMentionCountMode,
) => void;

export interface BackgroundMessageNotification {
	readonly message: WireMessage;
	readonly guildName: string | null;
	readonly channelName: string | null;
	readonly channelType: number | null;
}

export type ObserveMessageNotification = (notification: BackgroundMessageNotification) => void;

export interface BackgroundSnapshotSinkConfig {
	readonly userId: string;
	readonly observeMentionCounts: ObserveMentionCounts;
	readonly observeMessageNotification: ObserveMessageNotification;
}

export interface BackgroundSnapshotSink {
	applyReady(data: unknown): void;
	applyDispatch(type: string, data: unknown): void;
	reset(): void;
}
