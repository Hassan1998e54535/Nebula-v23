// SPDX-License-Identifier: Nebula

import {z} from 'zod';

export const PlutoniumPageAssignmentResponse = z.object({
	enabled: z.boolean(),
});

export type PlutoniumPageAssignmentResponse = z.infer<typeof PlutoniumPageAssignmentResponse>;
