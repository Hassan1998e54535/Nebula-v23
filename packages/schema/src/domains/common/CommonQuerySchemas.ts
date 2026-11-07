// SPDX-License-Identifier: Nebula

import {QueryBooleanType} from '@nexus/schema/src/primitives/QueryValidators';
import {z} from 'zod';

export const PurgeQuery = z.object({
	purge: QueryBooleanType.optional().describe('Whether to also purge the asset from storage'),
});

export type PurgeQuery = z.infer<typeof PurgeQuery>;
