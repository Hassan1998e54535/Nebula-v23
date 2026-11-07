// SPDX-License-Identifier: Nebula

import {getProfileMediaLayers, getProfileSurfaceColors} from '@app/features/user/utils/ProfileDisplayUtils';
import {DEFAULT_PROFILE_CUSTOMIZATION} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {describe, expect, it} from 'vitest';

describe('getProfileMediaLayers', () => {
	it('places the global effect and frame below the server-specific layers', () => {
		const globalCustomization = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			profileEffectId: 'global-effect',
			appearance: {...DEFAULT_PROFILE_CUSTOMIZATION.appearance, cardFrame: 'global-frame'},
		};
		const guildCustomization = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			profileEffectId: 'guild-effect',
			appearance: {...DEFAULT_PROFILE_CUSTOMIZATION.appearance, cardFrame: 'guild-frame'},
		};

		expect(getProfileMediaLayers(globalCustomization, guildCustomization)).toEqual({
			profileEffectIds: ['global-effect', 'guild-effect'],
			cardFrameIds: ['global-frame', 'guild-frame'],
		});
	});

	it('keeps only the global media when a server override has no media selected', () => {
		const globalCustomization = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			profileEffectId: 'global-effect',
			appearance: {...DEFAULT_PROFILE_CUSTOMIZATION.appearance, cardFrame: 'global-frame'},
		};

		expect(getProfileMediaLayers(globalCustomization, DEFAULT_PROFILE_CUSTOMIZATION)).toEqual({
			profileEffectIds: ['global-effect'],
			cardFrameIds: ['global-frame'],
		});
	});

	it('does not render empty or duplicate media layers', () => {
		const customization = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			profileEffectId: 'shared-effect',
			appearance: {...DEFAULT_PROFILE_CUSTOMIZATION.appearance, cardFrame: 'shared-frame'},
		};

		expect(getProfileMediaLayers(customization, customization)).toEqual({
			profileEffectIds: ['shared-effect'],
			cardFrameIds: ['shared-frame'],
		});
		expect(getProfileMediaLayers(DEFAULT_PROFILE_CUSTOMIZATION)).toEqual({
			profileEffectIds: [],
			cardFrameIds: [],
		});
	});
});

describe('getProfileSurfaceColors', () => {
	it('uses saved background colors for the profile border and cover', () => {
		const appearance = {
			...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
			profileBackgroundPrimary: '#123456',
			profileBackgroundSecondary: '#654321',
		};

		expect(getProfileSurfaceColors(appearance, '#abcdef')).toEqual({
			borderColor: '#123456',
			coverColor: '#123456',
		});
	});

	it('uses a saved custom divider color for the cover without changing the border', () => {
		const appearance = {
			...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
			profileBackgroundPrimary: '#123456',
			dividerMode: 'custom' as const,
			dividerCustomColor: '#fedcba',
		};

		expect(getProfileSurfaceColors(appearance, '#abcdef')).toEqual({
			borderColor: '#123456',
			coverColor: '#fedcba',
		});
	});

	it('falls back to the accent color when no saved background is set', () => {
		expect(getProfileSurfaceColors(DEFAULT_PROFILE_CUSTOMIZATION.appearance, '#abcdef')).toEqual({
			borderColor: '#abcdef',
			coverColor: '#abcdef',
		});
	});
});
