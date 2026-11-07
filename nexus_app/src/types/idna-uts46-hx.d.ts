// SPDX-License-Identifier: Nebula

declare module 'idna-uts46-hx' {
	interface Options {
		transitional?: boolean;
		useStd3ASCII?: boolean;
		verifyDnsLength?: boolean;
	}
	export function toAscii(domain: string, options?: Options): string;
	export function toUnicode(domain: string, options?: Options): string;
}
