// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {InstanceConfigAdminAuditCases} from '@app/api/admin/tests/audit_coverage/InstanceConfigAdminAuditCases';

describeAdminAuditCoverage('InstanceConfigAdminController', InstanceConfigAdminAuditCases);
