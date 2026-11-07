// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {UserWriteAdminAuditCases} from '@app/api/admin/tests/audit_coverage/UserWriteAdminAuditCases';

describeAdminAuditCoverage('UserAdminController writes', UserWriteAdminAuditCases);
