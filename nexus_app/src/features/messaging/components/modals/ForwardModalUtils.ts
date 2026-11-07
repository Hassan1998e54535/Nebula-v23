// SPDX-License-Identifier: Nebula

export function shouldNavigateAfterForward(skipNavigation: boolean, destinationCount: number): boolean {
	return !skipNavigation && destinationCount === 1;
}
