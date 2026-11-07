// SPDX-License-Identifier: Nebula

import {getRoleListDisplay} from '@app/features/guild/components/RoleListUtils';
import {describe, expect, it} from 'vitest';

describe('getRoleListDisplay', () => {
	it('keeps an empty role list collapsed without a negative overflow count', () => {
		expect(getRoleListDisplay([], false)).toEqual({
			rolesToRender: [],
			hiddenRoleCount: 0,
		});
	});

	it('shows every role without an overflow count when there are three or fewer', () => {
		const roles = ['Owner', 'Staff', 'Member'];

		expect(getRoleListDisplay(roles, false)).toEqual({
			rolesToRender: roles,
			hiddenRoleCount: 0,
		});
	});

	it('shows the first three roles and counts the hidden roles when collapsed', () => {
		const roles = ['Owner', 'Staff', 'Member', 'Artist', 'VIP', 'Guest', 'Helper', 'Partner', 'Bot', 'Newcomer'];

		expect(getRoleListDisplay(roles, false)).toEqual({
			rolesToRender: ['Owner', 'Staff', 'Member'],
			hiddenRoleCount: 7,
		});
	});

	it('shows all roles and retains the hidden-role count when expanded', () => {
		const roles = ['Owner', 'Staff', 'Member', 'Artist'];

		expect(getRoleListDisplay(roles, true)).toEqual({
			rolesToRender: roles,
			hiddenRoleCount: 1,
		});
	});
});
