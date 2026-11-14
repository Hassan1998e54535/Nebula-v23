// SPDX-License-Identifier: Nebula

const STORAGE_KEY = 'nexus_guild_role_custom_icons_v1';

export interface RoleIconData {
	icon?: string | null;
	unicodeEmoji?: string | null;
}

class RoleIconStorage {
	private cache: Map<string, RoleIconData> = new Map();
	private initialized = false;

	private init() {
		if (this.initialized) return;
		this.initialized = true;
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw) {
					const parsed = JSON.parse(raw);
					for (const [k, v] of Object.entries(parsed)) {
						if (v && typeof v === 'object') {
							this.cache.set(k, v as RoleIconData);
						}
					}
				}
			}
		} catch {
			// ignore storage errors
		}
	}

	private persist() {
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				const obj: Record<string, RoleIconData> = {};
				for (const [k, v] of this.cache.entries()) {
					obj[k] = v;
				}
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
			}
		} catch {
			// ignore storage errors
		}
	}

	setRoleIcon(roleId: string, data: {icon?: string | null; unicodeEmoji?: string | null}) {
		this.init();
		const current = this.cache.get(roleId) || {};
		const updated: RoleIconData = {
			icon: data.icon !== undefined ? data.icon : current.icon,
			unicodeEmoji: data.unicodeEmoji !== undefined ? data.unicodeEmoji : current.unicodeEmoji,
		};
		this.cache.set(roleId, updated);
		this.persist();
	}

	getRoleIcon(roleId: string): string | null {
		this.init();
		return this.cache.get(roleId)?.icon ?? null;
	}

	getRoleEmoji(roleId: string): string | null {
		this.init();
		return this.cache.get(roleId)?.unicodeEmoji ?? null;
	}
}

export const roleIconStorage = new RoleIconStorage();
