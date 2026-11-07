// SPDX-License-Identifier: Nebula

import Users from '@app/features/user/state/Users';
import MediaEngine, {useMediaEngineVersion} from '@app/features/voice/engine/MediaEngineFacade';
import {isCameraUserCapBlocked} from '@app/features/voice/utils/VoiceCameraCapacity';
import {ME} from '@nexus/constants/src/AppConstants';

export function useCameraUserCapBlocked(isOwnCameraEnabled: boolean): boolean {
	useMediaEngineVersion();
	const channelId = MediaEngine.channelId;
	if (!channelId) return false;
	const voiceStates = MediaEngine.getAllVoiceStatesInChannel(MediaEngine.guildId ?? ME, channelId);
	return isCameraUserCapBlocked({
		voiceStates,
		currentUserId: Users.getCurrentUser()?.id ?? null,
		isOwnCameraEnabled,
	});
}
