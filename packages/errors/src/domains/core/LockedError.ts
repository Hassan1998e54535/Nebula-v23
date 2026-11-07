// SPDX-License-Identifier: Nebula

import {statusError} from '@nexus/errors/src/NexusError';

export class LockedError extends statusError(423, false) {}
