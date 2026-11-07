// SPDX-License-Identifier: Nebula

export function resolveSettingsTitle(primaryTitle: string | null, fallbackTitle: string | null): string | null {
	if (primaryTitle != null && primaryTitle.length > 0) {
		return primaryTitle;
	}
	return fallbackTitle;
}
