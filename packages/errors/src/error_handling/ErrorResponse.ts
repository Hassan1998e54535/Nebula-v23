// SPDX-License-Identifier: Nebula

import {MimeType} from '@nexus/constants/src/HttpConstants';

interface JsonErrorResponseOptions {
	status: number;
	code: string;
	message: string;
	data?: Record<string, unknown>;
	headers?: Record<string, string>;
}

export function createJsonErrorResponse(options: JsonErrorResponseOptions): Response {
	return new Response(
		JSON.stringify({
			code: options.code,
			message: options.message,
			...(options.data ?? {}),
		}),
		{
			status: options.status,
			headers: {
				'Content-Type': MimeType.JSON,
				...(options.headers ?? {}),
			},
		},
	);
}
