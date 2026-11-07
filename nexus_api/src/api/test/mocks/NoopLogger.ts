// SPDX-License-Identifier: Nebula

import type {LoggerInterface} from '@nexus/logger/src/LoggerInterface';

function noop(): void {}

export class NoopLogger implements LoggerInterface {
	trace = noop;
	debug = noop;
	info = noop;
	warn = noop;
	error = noop;
	fatal = noop;

	child(): this {
		return this;
	}
}
