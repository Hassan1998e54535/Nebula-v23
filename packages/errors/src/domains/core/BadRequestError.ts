// SPDX-License-Identifier: Nebula

import {statusError} from '@nexus/errors/src/NexusError';

export class BadRequestError extends statusError(400) {}
