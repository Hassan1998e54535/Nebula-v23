// SPDX-License-Identifier: Nebula

export interface InstanceConfigurationRow {
	key: string;
	value: string | null;
	updated_at: Date | null;
}

export const INSTANCE_CONFIGURATION_COLUMNS = ['key', 'value', 'updated_at'] as const satisfies ReadonlyArray<
	keyof InstanceConfigurationRow
>;
