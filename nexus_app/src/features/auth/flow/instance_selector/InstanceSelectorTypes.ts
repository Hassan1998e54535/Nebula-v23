// SPDX-License-Identifier: Nebula

export const InstanceDiscoveryStatus = Object.freeze({
	IDLE: 'idle',
	DISCOVERING: 'discovering',
	ERROR: 'error',
} as const);

export type InstanceDiscoveryStatus = (typeof InstanceDiscoveryStatus)[keyof typeof InstanceDiscoveryStatus];

export const InstanceSelectorStep = Object.freeze({
	PICK: 'pick',
	ADD: 'add',
} as const);

export type InstanceSelectorStep = (typeof InstanceSelectorStep)[keyof typeof InstanceSelectorStep];

export const INSTANCE_SELECTOR_STEPS: ReadonlyArray<InstanceSelectorStep> = Object.freeze([
	InstanceSelectorStep.PICK,
	InstanceSelectorStep.ADD,
]);
