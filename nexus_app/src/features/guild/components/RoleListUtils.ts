// SPDX-License-Identifier: Nebula

export const COLLAPSED_ROLE_PREVIEW_COUNT = 3;

export function getRoleListDisplay<T>(roles: ReadonlyArray<T>, expanded: boolean) {
	const hiddenRoleCount = Math.max(roles.length - COLLAPSED_ROLE_PREVIEW_COUNT, 0);
	return {
		rolesToRender: expanded ? roles : roles.slice(0, COLLAPSED_ROLE_PREVIEW_COUNT),
		hiddenRoleCount,
	};
}
