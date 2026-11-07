// SPDX-License-Identifier: Nebula

import {webCameraSegmentationRuntimeAvailable} from '@app/features/voice/utils/camera-effects/WebCameraBackgroundSupport';

export function areVoiceBackgroundsAvailable(): boolean {
	return webCameraSegmentationRuntimeAvailable();
}
