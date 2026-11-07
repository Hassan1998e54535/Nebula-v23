// SPDX-License-Identifier: Nebula

import type {RichEmbedMediaRequestShape} from '@nexus/schema/src/domains/message/MessageRequestSchemas';
import type {z} from 'zod';

export interface RichEmbedMediaWithMetadata extends z.infer<typeof RichEmbedMediaRequestShape> {
	_attachmentMetadata?: {
		width: number | null;
		height: number | null;
		content_type: string;
		content_hash: string | null;
		placeholder: string | null;
		flags: number;
		duration: number | null;
		nsfw: boolean | null;
	};
}
