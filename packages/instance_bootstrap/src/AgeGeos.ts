// SPDX-License-Identifier: Nebula

import ageGeos from '@nexus/constants/src/AgeGeos.json' with {type: 'json'};
import type {GeoEntry} from '@nexus/instance_bootstrap/src/Types';

export const AGE_RESTRICTED_GEOS: ReadonlyArray<GeoEntry> = ageGeos.ageRestrictedGeos;
export const AGE_BLOCKED_GEOS: ReadonlyArray<GeoEntry> = ageGeos.ageBlockedGeos;
