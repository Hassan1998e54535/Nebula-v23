// SPDX-License-Identifier: Nebula

import type {APIErrorCode} from '@nexus/constants/src/ApiErrorCodes';
import type {ErrorResponse} from '@nexus/schema/src/domains/common/ErrorSchemas';
import {HTTPException} from 'hono/http-exception';

export type NexusErrorData = Record<string, unknown>;
export type NexusErrorStatus = HTTPException['status'];

interface NexusErrorOptions {
	code: string;
	message?: string;
	status: NexusErrorStatus;
	data?: NexusErrorData;
	headers?: Record<string, string>;
	messageVariables?: Record<string, unknown>;
	cause?: Error;
}

export class NexusError extends HTTPException {
	readonly code: string;
	override readonly message: string;
	override readonly status: NexusErrorStatus;
	readonly data?: NexusErrorData;
	readonly headers?: Record<string, string>;
	readonly messageVariables?: Record<string, unknown>;

	constructor(options: NexusErrorOptions) {
		const resolvedMessage = options.message ?? options.code;
		super(options.status, {message: resolvedMessage, cause: options.cause});
		this.code = options.code;
		this.message = resolvedMessage;
		this.status = options.status;
		this.data = options.data;
		this.headers = options.headers;
		this.messageVariables = options.messageVariables;
		this.name = 'NexusError';
	}

	override getResponse(): Response {
		return new Response(JSON.stringify(this.toJSON()), {
			status: this.status,
			headers: {
				'Content-Type': 'application/json',
				...this.headers,
			},
		});
	}

	toJSON(): ErrorResponse {
		return {
			code: this.code,
			message: this.message,
			...this.data,
		};
	}
}

type StatusErrorOptions = Omit<NexusErrorOptions, 'status' | 'code'>;
type RequiredStatusErrorOptions<TAllowMessage extends boolean> = {code: APIErrorCode} & (TAllowMessage extends true
	? StatusErrorOptions
	: Omit<StatusErrorOptions, 'message'>);

export function statusError<TAllowMessage extends boolean = true>(
	status: NexusErrorStatus,
	allowMessage: TAllowMessage = true as TAllowMessage,
) {
	return class extends NexusError {
		constructor(options: RequiredStatusErrorOptions<TAllowMessage>) {
			const {message, ...rest} = options as StatusErrorOptions & {code: APIErrorCode};
			super({...rest, status, message: allowMessage ? message : undefined});
		}
	};
}

export function defaultCodeStatusError<TCode extends string = APIErrorCode>(
	status: NexusErrorStatus,
	defaultCode: NoInfer<TCode>,
) {
	return class extends NexusError {
		constructor({code = defaultCode, ...options}: StatusErrorOptions & {code?: TCode} = {}) {
			super({...options, code, status});
		}
	};
}
