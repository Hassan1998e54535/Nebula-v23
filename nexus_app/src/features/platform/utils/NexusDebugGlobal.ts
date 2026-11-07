// SPDX-License-Identifier: Nebula

type NEXUSDebugObject = NonNullable<Window['__NEXUS_DEBUG__']>;

export function getNEXUSDebugObject(): NEXUSDebugObject | null {
	if (typeof window === 'undefined') {
		return null;
	}
	const existing = window.__NEXUS_DEBUG__;
	if (existing === undefined || existing === null) {
		const created: NEXUSDebugObject = {};
		window.__NEXUS_DEBUG__ = created;
		return created;
	}
	if (typeof existing !== 'object' || Array.isArray(existing)) {
		return null;
	}
	return existing;
}
