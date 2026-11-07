// SPDX-License-Identifier: Nebula

export class ScreenRecordingPermissionDeniedError extends Error {
	displayName = 'ScreenRecordingPermissionDeniedError';

	constructor() {
		super('Screen recording permission denied');
		this.name = 'ScreenRecordingPermissionDeniedError';
	}
}
