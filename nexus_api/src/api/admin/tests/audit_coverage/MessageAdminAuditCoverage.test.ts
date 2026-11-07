// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {MessageAdminAuditCases} from '@app/api/admin/tests/audit_coverage/MessageAdminAuditCases';

describeAdminAuditCoverage('MessageAdminController', MessageAdminAuditCases);
