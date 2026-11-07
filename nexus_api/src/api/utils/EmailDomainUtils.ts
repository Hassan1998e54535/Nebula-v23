// SPDX-License-Identifier: Nebula

export function extractEmailDomain(email: string | null | undefined): string | null {
	const normalized = email?.trim().toLowerCase();
	if (!normalized) return null;
	const atIndex = normalized.lastIndexOf('@');
	if (atIndex <= 0 || atIndex === normalized.length - 1) return null;
	return normalized.slice(atIndex + 1);
}
