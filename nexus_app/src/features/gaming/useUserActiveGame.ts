// SPDX-License-Identifier: Nebula

import {fetchGuildGaming} from '@app/features/gaming/GamingClient';
import type {GamingEntry} from '@app/features/gaming/GamingTypes';
import Authentication from '@app/features/auth/state/Authentication';
import {getProtectedLocalStorage} from '@app/features/platform/state/ProtectedWebStorage';
import {useEffect, useState} from 'react';

function readLocalGamingItem(key: string): string | null {
	try {
		const storage = getProtectedLocalStorage() ?? (typeof window !== 'undefined' ? window.localStorage ?? null : null);
		return storage?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

const guildCache = new Map<string, {expires: number; players: Map<string, GamingEntry>}>();

export function useUserActiveGame(guildId?: string, userId?: string): GamingEntry | null {
	const currentUserId = Authentication.currentUserId;
	const isCurrentUser = Boolean(userId && currentUserId && userId === currentUserId);

	const [game, setGame] = useState<GamingEntry | null>(() => {
		if (!userId) return null;
		if (isCurrentUser) {
			try {
				const raw = readLocalGamingItem(`nexus:gaming:active:${userId}`);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (parsed?.game) return parsed.game as GamingEntry;
				}
			} catch {}
		}
		if (guildId && guildCache.has(guildId)) {
			return guildCache.get(guildId)!.players.get(userId) ?? null;
		}
		return null;
	});

	useEffect(() => {
		if (!userId) {
			setGame(null);
			return;
		}

		let mounted = true;

		const readLocal = () => {
			if (isCurrentUser) {
				try {
					const raw = readLocalGamingItem(`nexus:gaming:active:${userId}`);
					if (raw) {
						const parsed = JSON.parse(raw);
						if (parsed?.game) {
							if (mounted) setGame(parsed.game as GamingEntry);
							return true;
						}
					}
				} catch {}
			}
			return false;
		};

		readLocal();

		const refresh = async () => {
			readLocal();
			if (!guildId) return;
			const cached = guildCache.get(guildId);
			if (cached && cached.expires > Date.now()) {
				if (mounted) setGame(cached.players.get(userId) ?? null);
				return;
			}
			try {
				const data = await fetchGuildGaming(guildId);
				const map = new Map<string, GamingEntry>();
				for (const p of data.players) {
					map.set(p.user_id, p.game);
				}
				guildCache.set(guildId, {expires: Date.now() + 25_000, players: map});
				if (mounted) setGame(map.get(userId) ?? null);
			} catch {
				if (mounted && !isCurrentUser) setGame(null);
			}
		};

		const onActivityChange = (event?: any) => {
			if (event?.detail?.game) {
				if (mounted) setGame(event.detail.game as GamingEntry);
			} else if (event?.detail === null) {
				if (mounted) setGame(null);
			} else {
				readLocal();
			}
		};
		window.addEventListener('nexus:gaming:activity-changed', onActivityChange);
		window.addEventListener('storage', onActivityChange);

		void refresh();
		let interval: number | null = null;
		if (guildId) {
			interval = window.setInterval(() => void refresh(), 25_000);
		}
		return () => {
			mounted = false;
			if (interval) window.clearInterval(interval);
			window.removeEventListener('nexus:gaming:activity-changed', onActivityChange);
			window.removeEventListener('storage', onActivityChange);
		};
	}, [guildId, userId, isCurrentUser]);

	return game;
}
