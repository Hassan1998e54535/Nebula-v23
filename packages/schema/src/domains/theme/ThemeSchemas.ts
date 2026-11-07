// SPDX-License-Identifier: Nebula

import {HexString16Type} from '@nexus/schema/src/primitives/SchemaPrimitives';
import {z} from 'zod';

export const ThemeCreateRequest = z.object({
	css: z.string().min(1).describe('CSS text to store and share'),
});

export type ThemeCreateRequest = z.infer<typeof ThemeCreateRequest>;

export const ThemeCreateResponse = z.object({
	id: HexString16Type.describe('The unique identifier for the created theme'),
});

export type ThemeCreateResponse = z.infer<typeof ThemeCreateResponse>;
