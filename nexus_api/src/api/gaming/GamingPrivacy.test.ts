// SPDX-License-Identifier: Nebula

import {resolveHiddenGamingGuildIds, shouldShareGamingActivityInGuild} from '@app/api/gaming/GamingPrivacy';
import {describe, expect, it} from 'vitest';

describe('gaming activity privacy', () => {
	it('keeps only unique hidden servers the user still belongs to', () => {
		expect(resolveHiddenGamingGuildIds(['20', '10', '20', '99'], [], ['10', '20', '30'])).toEqual(['10', '20']);
	});

	it('preserves saved server choices when an older client omits them', () => {
		expect(resolveHiddenGamingGuildIds(undefined, ['20'], ['10', '20'])).toEqual(['20']);
	});

	it('allows a server override without changing global sharing elsewhere', () => {
		expect(shouldShareGamingActivityInGuild(true, ['20'], '10')).toBe(true);
		expect(shouldShareGamingActivityInGuild(true, ['20'], '20')).toBe(false);
		expect(shouldShareGamingActivityInGuild(false, ['20'], '10')).toBe(false);
	});
});
