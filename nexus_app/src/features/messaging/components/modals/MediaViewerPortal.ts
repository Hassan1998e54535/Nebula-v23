// SPDX-License-Identifier: Nebula

export const MEDIA_VIEWER_PORTAL_ROOT_ID = 'media-viewer-portal-root';

export function getMediaViewerPortalRoot(): HTMLElement | null {
	if (typeof document === 'undefined') {
		return null;
	}
	return document.getElementById(MEDIA_VIEWER_PORTAL_ROOT_ID) ?? document.body;
}
