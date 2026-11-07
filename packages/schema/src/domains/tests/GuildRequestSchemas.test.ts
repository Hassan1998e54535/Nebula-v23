// SPDX-License-Identifier: Nebula

import {
	GuildMemberUpdateRequest,
	MyGuildMemberUpdateRequest,
} from '@nexus/schema/src/domains/guild/GuildRequestSchemas';
import {TemplateChannel} from '@nexus/schema/src/domains/guild/GuildTemplateSchemas';
import {DEFAULT_PROFILE_CUSTOMIZATION} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {describe, expect, it} from 'vitest';

describe('TemplateChannel permission overwrites', () => {
	it.each([
		['role', 0],
		['member', 1],
		['0', 0],
		[1, 1],
		[42, 42],
	])('normalizes the imported overwrite type %j', (type, expected) => {
		const channel = TemplateChannel.parse({
			id: '1',
			type: 0,
			position: 0,
			permission_overwrites: [{id: '2', type, allow: '8', deny: '0'}],
		});
		expect(channel.permission_overwrites).toEqual([{id: '2', type: expected, allow: '8', deny: '0'}]);
	});

	it.each(['invalid', 'NaN', 'Infinity', Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects nonfinite overwrite type %j',
		(type) => {
			expect(
				TemplateChannel.safeParse({
					id: '1',
					type: 0,
					position: 0,
					permission_overwrites: [{id: '2', type, allow: '8', deny: '0'}],
				}).success,
			).toBe(false);
		},
	);
});

describe('guild member profile appearance scope', () => {
	it('accepts appearance overrides only on the self-profile update request', () => {
		const profileAppearance = {
			...DEFAULT_PROFILE_CUSTOMIZATION,
			appearance: {
				...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
				profileBackgroundPrimary: '#0B0B0F',
				profileBackgroundSecondary: '#A31425',
			},
		};

		expect(MyGuildMemberUpdateRequest.parse({profile_appearance: profileAppearance}).profile_appearance).toEqual(
			profileAppearance,
		);
		expect(MyGuildMemberUpdateRequest.parse({profile_appearance: null}).profile_appearance).toBeNull();
		expect(GuildMemberUpdateRequest.parse({profile_appearance: profileAppearance})).not.toHaveProperty(
			'profile_appearance',
		);
	});
});
