// SPDX-License-Identifier: Nebula

import type {GatewayVoiceStateEntry} from '@app/api/infrastructure/IGatewayService';

export function isStreamPreviewHiddenFromViewer(
	voiceStates: ReadonlyArray<GatewayVoiceStateEntry>,
	streamConnectionId: string,
	viewerUserId: string,
): boolean {
	const streamOwnerState = voiceStates.find((voiceState) => voiceState.connectionId === streamConnectionId);
	if (!streamOwnerState?.hideStreamPreviewOutsideChannel) return false;
	return !voiceStates.some((voiceState) => voiceState.userId === viewerUserId);
}
