// SPDX-License-Identifier: Nebula

import {Logger} from '@app/features/platform/utils/AppLogger';
import VoiceDevicePermissionState from '@app/features/voice/engine/VoiceDevicePermissionState';

const logger = new Logger('MediaDeviceRefresh');

export enum MediaDeviceRefreshType {
	audio = 'audio',
	video = 'video',
}

export interface RefreshMediaDeviceListsOptions {
	type: MediaDeviceRefreshType;
}

export async function refreshMediaDeviceLists(options: RefreshMediaDeviceListsOptions): Promise<void> {
	const {type} = options;
	try {
		await VoiceDevicePermissionState.ensureDevices({
			requestPermissionTypes: [type === MediaDeviceRefreshType.audio ? 'audio' : 'video'],
			forceRefresh: true,
		});
	} catch (error) {
		logger.error('Failed to refresh media device lists', error);
	}
}
