// SPDX-License-Identifier: Nebula

import {describe, expect, test} from 'vitest';
import {
	parseMobileConversationLocation,
	parseMobileListLocation,
	resolveMobileSwipeIntent,
} from '@app/features/navigation/utils/MobileSwipeNavigationUtils';

describe('mobile swipe navigation routes', () => {
	test('maps a DM conversation back to the DM list', () => {
		expect(parseMobileConversationLocation('/channels/@me/dm-1')).toEqual({
			kind: 'dm',
			channelId: 'dm-1',
			contextKey: 'dm',
		});
	});

	test('maps a guild conversation to its guild channel list', () => {
		expect(parseMobileConversationLocation('/channels/guild-1/channel-1/threads/thread-1')).toEqual({
			kind: 'guild',
			guildId: 'guild-1',
			channelId: 'channel-1',
			contextKey: 'guild:guild-1',
		});
	});

	test('does not treat the guild members page as a channel', () => {
		expect(parseMobileConversationLocation('/channels/guild-1/members')).toBeNull();
	});

	test('recognizes only list roots as swipe-forward origins', () => {
		expect(parseMobileListLocation('/channels/@me')).toEqual({kind: 'dm', contextKey: 'dm'});
		expect(parseMobileListLocation('/channels/guild-1')).toEqual({
			kind: 'guild',
			guildId: 'guild-1',
			contextKey: 'guild:guild-1',
		});
		expect(parseMobileListLocation('/notifications')).toBeNull();
	});
});

describe('mobile swipe directions', () => {
	test('maps back and forward swipes in LTR', () => {
		expect(resolveMobileSwipeIntent(90, 8, false)).toBe('back');
		expect(resolveMobileSwipeIntent(-90, 8, false)).toBe('forward');
	});

	test('reverses swipe direction in RTL', () => {
		expect(resolveMobileSwipeIntent(-90, 8, true)).toBe('back');
		expect(resolveMobileSwipeIntent(90, 8, true)).toBe('forward');
	});

	test('ignores short and predominantly vertical gestures', () => {
		expect(resolveMobileSwipeIntent(40, 0, false)).toBeNull();
		expect(resolveMobileSwipeIntent(90, 70, false)).toBeNull();
	});
});
