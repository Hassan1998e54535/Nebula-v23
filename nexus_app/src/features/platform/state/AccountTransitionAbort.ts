// SPDX-License-Identifier: Nebula

const accountTransitionAbortErrors = new WeakSet<object>();

export function createAccountTransitionAbortError(): DOMException {
	const error = new DOMException('Aborted by an account transition', 'AbortError');
	accountTransitionAbortErrors.add(error);
	return error;
}

export function isAccountTransitionAbortError(error: unknown): boolean {
	return typeof error === 'object' && error !== null && accountTransitionAbortErrors.has(error);
}
