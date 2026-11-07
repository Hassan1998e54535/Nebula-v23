// SPDX-License-Identifier: Nebula

export function resolveURLFromRoot(input: string | URL, reference: string | URL): URL {
	return new URL(input, new URL('/', reference));
}

export function resolveDocumentURLFromRoot(input: string | URL): URL {
	return resolveURLFromRoot(input, window.location.href);
}
