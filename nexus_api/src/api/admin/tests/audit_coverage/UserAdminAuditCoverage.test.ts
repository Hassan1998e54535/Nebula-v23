// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {UserAdminAuditCases} from '@app/api/admin/tests/audit_coverage/UserAdminAuditCases';

describeAdminAuditCoverage('UserAdminController', UserAdminAuditCases);
