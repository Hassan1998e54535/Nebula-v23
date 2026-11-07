// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {LimitConfigAdminAuditCases} from '@app/api/admin/tests/audit_coverage/LimitConfigAdminAuditCases';

describeAdminAuditCoverage('LimitConfigAdminController', LimitConfigAdminAuditCases);
