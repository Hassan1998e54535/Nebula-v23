// SPDX-License-Identifier: Nebula

import type {MessageDescriptor, MessageOptions} from '@lingui/core';

declare module '@lingui/core' {
	interface I18n {
		_(descriptor: MessageDescriptor, values?: Record<string, unknown>, options?: MessageOptions): string;
	}
}
