// SPDX-License-Identifier: Nebula

import MediaEngine from '@app/features/voice/engine/MediaEngineFacade';

export function hasValidRoomForVoiceCallContext(channelId: string, guildId: string | null | undefined): boolean {
	const room = MediaEngine.room;
	const isCurrentVoiceContext =
		MediaEngine.channelId === channelId && (MediaEngine.guildId ?? null) === (guildId ?? null);
	if (room) return isCurrentVoiceContext;
	return MediaEngine.connected && isCurrentVoiceContext;
}
