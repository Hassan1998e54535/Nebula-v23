// SPDX-License-Identifier: Nebula

import {statusError} from '@nexus/errors/src/NexusError';

export class NotFoundError extends statusError(404) {}
