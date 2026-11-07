// SPDX-License-Identifier: Nebula

import {
	type ProfileCustomization,
	ProfileCustomizationSchema,
} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';

export function parseProfileCustomization(value: string | null | undefined): ProfileCustomization | null {
	if (!value) return null;
	try {
		const parsed = ProfileCustomizationSchema.safeParse(JSON.parse(value));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
