// SPDX-License-Identifier: Nebula

import {statusError} from '@nexus/errors/src/NexusError';

export class ForbiddenError extends statusError(403) {}
