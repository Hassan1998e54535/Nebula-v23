// SPDX-License-Identifier: Nebula

import {AdminACLs} from '@nexus/constants/src/AdminACLs';
import {z} from 'zod';

export const AdminAclType = z.enum(AdminACLs);

export const ADMIN_ACL_COUNT = AdminAclType.options.length;

export type AdminAclType = z.infer<typeof AdminAclType>;
