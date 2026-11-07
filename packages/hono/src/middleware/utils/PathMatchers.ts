// SPDX-License-Identifier: Nebula

function matchesPathPattern(path: string, pattern: string): boolean {
	if (pattern.endsWith('*')) {
		return path.startsWith(pattern.slice(0, -1));
	}
	return path === pattern;
}

export function matchesAnyPathPattern(path: string, patterns: Array<string>): boolean {
	for (const pattern of patterns) {
		if (matchesPathPattern(path, pattern)) {
			return true;
		}
	}
	return false;
}
