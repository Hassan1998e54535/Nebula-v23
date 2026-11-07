// SPDX-License-Identifier: Nebula

import {
	DEFAULT_PROFILE_CUSTOMIZATION,
	ProfileCustomizationSchema,
} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {describe, expect, it} from 'vitest';

describe('ProfileCustomizationSchema', () => {
	it('accepts the default appearance and a complete saved effect', () => {
		const customization = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			appearance: {
				...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
				nameStyleEnabled: true,
				nameEffect: 'orbit',
				profileBackgroundPrimary: '#000000',
				profileBackgroundSecondary: '#A31425',
				nameEffects: {
					orbit: {
						colors: ['#48e6d0', '#7b8cff', '#e4a8ff'],
						direction: 'right' as const,
						speed: 'normal' as const,
						intensity: 70,
					},
				},
			},
		};

		expect(ProfileCustomizationSchema.parse(customization)).toEqual(customization);
	});

	it('rejects invalid colors and oversized customization payloads', () => {
		const invalidColor = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			appearance: {
				...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
				nameColorStart: 'url(https://example.invalid)',
			},
		};
		const oversized = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			appearance: {
				...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
				unused: 'x'.repeat(17_000),
			},
		};

		expect(ProfileCustomizationSchema.safeParse(invalidColor).success).toBe(false);
		expect(ProfileCustomizationSchema.safeParse(oversized).success).toBe(false);
	});
});
