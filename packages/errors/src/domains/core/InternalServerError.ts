// SPDX-License-Identifier: Nebula

import {statusError} from '@nexus/errors/src/NexusError';

export class InternalServerError extends statusError(500, false) {}
