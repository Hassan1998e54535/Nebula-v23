// SPDX-License-Identifier: Nebula

export function escapeRegex(str: string) {
	return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}
