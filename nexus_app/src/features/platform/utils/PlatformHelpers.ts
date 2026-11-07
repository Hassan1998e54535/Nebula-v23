// SPDX-License-Identifier: Nebula

export function isAbortError(error: unknown): boolean {
	return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
}
export function isApplePlatform(): boolean {
	return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
