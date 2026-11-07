// SPDX-License-Identifier: Nebula

export interface StreamPreviewPermissionContext {
	guildId: string | null | undefined;
	channelId: string | null | undefined;
	hasConnectPermission: () => boolean;
}

export function canViewStreamPreview(params: StreamPreviewPermissionContext): boolean {
	const {guildId, channelId} = params;
	if (!guildId || !channelId) {
		return true;
	}
	return params.hasConnectPermission();
}
