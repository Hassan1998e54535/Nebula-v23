// SPDX-License-Identifier: Nebula

import {Routes} from '@app/app/Routes';
import {ComponentBus} from '@app/features/platform/utils/ComponentBus';
import {goBackOr} from '@app/features/platform/components/router/NavigationAdapter';
import * as RouterUtils from '@app/features/navigation/utils/RouterUtils';
import {
	parseMobileConversationLocation,
	parseMobileListLocation,
	resolveMobileSwipeIntent,
} from '@app/features/navigation/utils/MobileSwipeNavigationUtils';
import {useEffect, useRef} from 'react';

const MAX_SWIPE_DURATION_MS = 450;
const SAFARI_EDGE_GUARD_PX = 32;

interface MobileConversationRoute {
	conversationPath: string;
	listPath: string;
	contextKey: string;
}

interface MobileListContext {
	listPath: string;
	contextKey: string;
}

interface PointerStart {
	pointerId: number;
	x: number;
	y: number;
	startedAt: number;
	target: Element;
}

function resolveMobileConversationRoute(pathname: string): MobileConversationRoute | null {
	const location = parseMobileConversationLocation(pathname);
	if (!location) {
		return null;
	}
	if (location.kind === 'dm') {
		return {
			conversationPath: Routes.dmChannel(location.channelId),
			listPath: Routes.ME,
			contextKey: location.contextKey,
		};
	}
	if (location.kind === 'favorites') {
		return {
			conversationPath: Routes.favoritesChannel(location.channelId),
			listPath: Routes.FAVORITES,
			contextKey: location.contextKey,
		};
	}
	return {
		conversationPath: Routes.guildChannel(location.guildId, location.channelId),
		listPath: Routes.guildChannel(location.guildId),
		contextKey: location.contextKey,
	};
}

function resolveMobileListContext(pathname: string): MobileListContext | null {
	const location = parseMobileListLocation(pathname);
	if (!location) {
		return null;
	}
	if (location.kind === 'dm') {
		return {listPath: Routes.ME, contextKey: location.contextKey};
	}
	if (location.kind === 'favorites') {
		return {listPath: Routes.FAVORITES, contextKey: location.contextKey};
	}
	return {
		listPath: Routes.guildChannel(location.guildId),
		contextKey: location.contextKey,
	};
}

function shouldIgnoreGestureTarget(target: Element): boolean {
	if (
		target.closest(
			'input, textarea, select, [contenteditable="true"], [data-swipe-ignore], [data-flx*="message-action"], [data-flx*="reaction-picker"], [data-flx*="user-area-popout"], [data-flx*="account-popout"]',
		)
	) {
		return true;
	}
	const channelDetailsSheet = target.closest('[data-flx="channel.channel-header.channel-details-bottom-sheet"]');
	if (target.closest('[role="dialog"], [aria-modal="true"]') && !channelDetailsSheet) {
		return true;
	}

	for (let element: HTMLElement | null = target as HTMLElement; element; element = element.parentElement) {
		const {overflowX} = window.getComputedStyle(element);
		if ((overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth + 1) {
			return true;
		}
	}
	return false;
}

function hasTextSelection(): boolean {
	return Boolean(window.getSelection()?.toString());
}

export function useMobileSwipeNavigation(enabled: boolean, pathname: string): void {
	const lastConversationRef = useRef<MobileConversationRoute | null>(null);
	const channelDetailsOpenRef = useRef(false);

	useEffect(() => {
		const conversationRoute = resolveMobileConversationRoute(pathname);
		if (conversationRoute) {
			lastConversationRef.current = conversationRoute;
		}
		channelDetailsOpenRef.current = false;
		if (!enabled) {
			return;
		}

		let pointerStart: PointerStart | null = null;
		let suppressedClickTarget: Element | null = null;
		let suppressedClickTimeout: number | null = null;

		const handleChannelDetailsOpen = () => {
			channelDetailsOpenRef.current = true;
		};
		const handleChannelDetailsClose = () => {
			channelDetailsOpenRef.current = false;
		};
		const unsubscribeOpen = ComponentBus.subscribe('CHANNEL_DETAILS_OPEN', handleChannelDetailsOpen);
		const unsubscribeClose = ComponentBus.subscribe('CHANNEL_DETAILS_CLOSE', handleChannelDetailsClose);

		const handlePointerDown = (event: PointerEvent) => {
			if (!event.isPrimary || event.pointerType !== 'touch' || hasTextSelection()) {
				return;
			}
			const target = event.target;
			if (!(target instanceof Element) || shouldIgnoreGestureTarget(target)) {
				return;
			}
			const viewportWidth = window.innerWidth;
			if (event.clientX <= SAFARI_EDGE_GUARD_PX || event.clientX >= viewportWidth - SAFARI_EDGE_GUARD_PX) {
				return;
			}
			pointerStart = {
				pointerId: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				startedAt: Date.now(),
				target,
			};
		};

		const handlePointerUp = (event: PointerEvent) => {
			const start = pointerStart;
			pointerStart = null;
			if (!start || start.pointerId !== event.pointerId || hasTextSelection()) {
				return;
			}
			if (Date.now() - start.startedAt > MAX_SWIPE_DURATION_MS) {
				return;
			}

			const intent = resolveMobileSwipeIntent(
				event.clientX - start.x,
				event.clientY - start.y,
				window.getComputedStyle(document.body).direction === 'rtl',
			);
			if (!intent) {
				return;
			}

			const conversationRoute = resolveMobileConversationRoute(pathname);
			if (pathname === Routes.NOTIFICATIONS && intent === 'back') {
				goBackOr(Routes.ME);
			} else if (conversationRoute && intent === 'back') {
				if (channelDetailsOpenRef.current) {
					ComponentBus.dispatch('CHANNEL_DETAILS_CLOSE');
				} else {
					goBackOr(conversationRoute.listPath);
				}
			} else if (conversationRoute && intent === 'forward') {
				if (ComponentBus.hasSubscribers('CHANNEL_DETAILS_OPEN')) {
					ComponentBus.dispatch('CHANNEL_DETAILS_OPEN', {initialTab: 'members'});
				}
			} else if (intent === 'forward') {
				const listContext = resolveMobileListContext(pathname);
				const lastConversation = lastConversationRef.current;
				if (listContext && lastConversation?.contextKey === listContext.contextKey) {
					RouterUtils.transitionTo(lastConversation.conversationPath);
				}
			} else {
				return;
			}

			suppressedClickTarget = start.target;
			if (suppressedClickTimeout !== null) {
				window.clearTimeout(suppressedClickTimeout);
			}
			suppressedClickTimeout = window.setTimeout(() => {
				suppressedClickTarget = null;
				suppressedClickTimeout = null;
			}, 350);
			event.preventDefault();
		};

		const handlePointerCancel = () => {
			pointerStart = null;
		};
		const handleClickCapture = (event: MouseEvent) => {
			const source = suppressedClickTarget;
			const target = event.target;
			if (!source || !(target instanceof Node)) {
				return;
			}
			if (source === target || source.contains(target) || target.contains(source)) {
				event.preventDefault();
				event.stopImmediatePropagation();
				suppressedClickTarget = null;
				if (suppressedClickTimeout !== null) {
					window.clearTimeout(suppressedClickTimeout);
					suppressedClickTimeout = null;
				}
			}
		};

		document.addEventListener('pointerdown', handlePointerDown, true);
		document.addEventListener('pointerup', handlePointerUp, true);
		document.addEventListener('pointercancel', handlePointerCancel, true);
		document.addEventListener('click', handleClickCapture, true);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, true);
			document.removeEventListener('pointerup', handlePointerUp, true);
			document.removeEventListener('pointercancel', handlePointerCancel, true);
			document.removeEventListener('click', handleClickCapture, true);
			unsubscribeOpen();
			unsubscribeClose();
			if (suppressedClickTimeout !== null) {
				window.clearTimeout(suppressedClickTimeout);
			}
			pointerStart = null;
			suppressedClickTarget = null;
			channelDetailsOpenRef.current = false;
		};
	}, [enabled, pathname]);
}
