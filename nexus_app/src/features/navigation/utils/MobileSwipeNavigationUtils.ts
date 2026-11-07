// SPDX-License-Identifier: Nebula

export type MobileConversationLocation =
	| {kind: 'dm' | 'favorites'; channelId: string; contextKey: string}
	| {kind: 'guild'; guildId: string; channelId: string; contextKey: string};

export type MobileListLocation =
	| {kind: 'dm' | 'favorites'; contextKey: string}
	| {kind: 'guild'; guildId: string; contextKey: string};

export type MobileSwipeIntent = 'back' | 'forward';

export function parseMobileConversationLocation(pathname: string): MobileConversationLocation | null {
	const normalizedPath = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
	const segments = normalizedPath.split('/').filter(Boolean);
	if (segments[0] !== 'channels') {
		return null;
	}

	if (segments[1] === '@me' || segments[1] === '@favorites') {
		const channelId = segments[2];
		if (!channelId) {
			return null;
		}
		const isFavorites = segments[1] === '@favorites';
		return {
			kind: isFavorites ? 'favorites' : 'dm',
			channelId,
			contextKey: isFavorites ? 'favorites' : 'dm',
		};
	}

	const guildId = segments[1];
	const channelId = segments[2];
	if (!guildId || !channelId || channelId === 'members' || guildId.startsWith('@')) {
		return null;
	}

	return {kind: 'guild', guildId, channelId, contextKey: `guild:${guildId}`};
}

export function parseMobileListLocation(pathname: string): MobileListLocation | null {
	const normalizedPath = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
	if (normalizedPath === '/channels/@me') {
		return {kind: 'dm', contextKey: 'dm'};
	}
	if (normalizedPath === '/channels/@favorites') {
		return {kind: 'favorites', contextKey: 'favorites'};
	}

	const segments = normalizedPath.split('/').filter(Boolean);
	if (segments[0] === 'channels' && segments.length === 2 && !segments[1].startsWith('@')) {
		return {kind: 'guild', guildId: segments[1], contextKey: `guild:${segments[1]}`};
	}
	return null;
}

export function resolveMobileSwipeIntent(
	deltaX: number,
	deltaY: number,
	isRtl: boolean,
): MobileSwipeIntent | null {
	if (Math.abs(deltaX) < 72 || Math.abs(deltaY) > 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) {
		return null;
	}
	const isBackSwipe = isRtl ? deltaX < 0 : deltaX > 0;
	return isBackSwipe ? 'back' : 'forward';
}
