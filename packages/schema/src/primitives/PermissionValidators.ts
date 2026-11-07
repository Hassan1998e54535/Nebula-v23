// SPDX-License-Identifier: Nebula

import {Permissions, PermissionsDescriptions} from '@nexus/constants/src/ChannelConstants';
import {createPermissionStringType, withOpenApiType} from '@nexus/schema/src/primitives/SchemaPrimitives';

export const PermissionStringType = withOpenApiType(
	createPermissionStringType(Permissions, PermissionsDescriptions, 'Permission bitfield as string', 'Permissions'),
	'Permissions',
);
