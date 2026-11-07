// SPDX-License-Identifier: Nebula

import {EMPTY_USER_ROW} from '@app/api/database/types/UserTypes';
import {User} from '@app/api/models/User';
import {DEFAULT_PROFILE_CUSTOMIZATION} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {describe, expect, it} from 'vitest';

describe('User profile appearance persistence', () => {
	it('loads and writes the NEXUS customization through the existing user row', () => {
		const customization = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			appearance: {
				...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
				nameStyleEnabled: true,
				nameEffect: 'orbit',
				profileBackgroundPrimary: '#000000',
				profileBackgroundSecondary: '#A31425',
			},
		};
		const row = {
			...EMPTY_USER_ROW,
			user_id: 845_672_109n,
			username: 'profile-test',
			discriminator: 2718,
			profile_appearance: JSON.stringify(customization),
		};

		const user = new User(row);
		const restored = new User(user.toRow());

		expect(user.profileAppearance).toEqual(customization);
		expect(restored.profileAppearance).toEqual(customization);
	});

	it('ignores malformed appearance JSON without disrupting user loading', () => {
		const user = new User({
			...EMPTY_USER_ROW,
			user_id: 845_672_110n,
			username: 'profile-test',
			discriminator: 2719,
			profile_appearance: '{invalid-json',
		});

		expect(user.profileAppearance).toBeNull();
		expect(user.username).toBe('profile-test');
	});
});
