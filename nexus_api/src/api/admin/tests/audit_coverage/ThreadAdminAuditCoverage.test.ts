// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {ThreadAdminAuditCases} from '@app/api/admin/tests/audit_coverage/ThreadAdminAuditCases';

describeAdminAuditCoverage('ThreadAdminController', ThreadAdminAuditCases);
