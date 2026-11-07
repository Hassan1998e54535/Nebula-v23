// SPDX-License-Identifier: Nebula

import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

// These are wiring guards, not browser interaction tests. Keep the existing
// action components reachable when changing the visual profile layout.
const profileSource = readFileSync(
	new URL('./UserProfileMobileSheet.tsx', import.meta.url),
	'utf8',
);
const statusSource = readFileSync(
	new URL('./StatusChangeBottomSheet.tsx', import.meta.url),
	'utf8',
);

describe('mobile own-profile action wiring', () => {
	it('opens the existing status sheet from the own avatar without a presence/platform gate', () => {
		const avatarHandler = profileSource.match(/onAvatarClick=\{([\s\S]*?)\}/)?.[1];
		expect(avatarHandler).toContain('isCurrentUser ? () => setStatusSheetOpen(true) : undefined');
		expect(avatarHandler).not.toContain('Presence.isMobile');
		expect(avatarHandler).not.toContain('StatusTypes.ONLINE');
	});

	it('retains the visible status, add-account, account-arrow and settings entries', () => {
		for (const entry of [
			'owner-account-actions.set-status',
			'owner-account-actions.add-account',
			'account-actions-button',
			'profile-action-dock.settings',
		]) {
			expect(profileSource).toContain(`user.user-profile-mobile-sheet.${entry}`);
		}
		expect(profileSource).toContain('{renderCurrentUserAccountActions()}');
		expect(profileSource).toContain('<StatusChangeBottomSheet isOpen={statusSheetOpen}');
		expect(profileSource).toContain('<MenuBottomSheet');
	});

	it('retains custom status, all four presence choices and expiry handling in the existing sheet', () => {
		expect(statusSource).toContain('<CustomStatusBottomSheet');
		for (const status of ['ONLINE', 'IDLE', 'DND', 'INVISIBLE']) {
			expect(statusSource).toContain(`StatusTypes.${status}`);
		}
		expect(statusSource).toContain('StatusExpiry.setActiveStatusExpiry');
		expect(statusSource).toContain('const STATUS_SHEET_SNAP_POINTS: Array<number> = [0, 0.5, 0.75, 1]');
	});
});
