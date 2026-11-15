// SPDX-License-Identifier: Nebula

import type {GuildRole} from '@app/features/guild/models/GuildRole';

export const ROLE_DND_TYPE = 'guild-role';
export const GUILD_ROLES_TAB_ID = 'roles';

export interface RoleDragItem {
	type: typeof ROLE_DND_TYPE;
	id: string;
	isEveryone: boolean;
	isLocked: boolean;
}

export interface RoleUpdate {
	id: string;
	name?: string;
	color?: number;
	hoist?: boolean;
	mentionable?: boolean;
	permissions?: bigint;
	icon?: string | null;
	unicode_emoji?: string | null;
}

export function applyRoleUpdate(role: GuildRole, updates: RoleUpdate | undefined): GuildRole {
	if (!updates) return role;
	return role.withUpdates({
		name: updates.name ?? role.name,
		color: updates.color ?? role.color,
		hoist: updates.hoist ?? role.hoist,
		mentionable: updates.mentionable ?? role.mentionable,
		permissions: updates.permissions?.toString() ?? role.permissions.toString(),
		position: role.position,
		icon: updates.icon !== undefined ? updates.icon : role.icon,
		unicode_emoji: updates.unicode_emoji !== undefined ? updates.unicode_emoji : role.unicodeEmoji,
	});
}
