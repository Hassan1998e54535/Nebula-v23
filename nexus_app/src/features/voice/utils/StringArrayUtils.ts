// SPDX-License-Identifier: Nebula

export function areOrderedStringArraysEqual(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
	if (left === right) return true;
	if (left.length !== right.length) return false;
	for (let index = 0; index < left.length; index += 1) {
		if (left[index] !== right[index]) return false;
	}
	return true;
}
