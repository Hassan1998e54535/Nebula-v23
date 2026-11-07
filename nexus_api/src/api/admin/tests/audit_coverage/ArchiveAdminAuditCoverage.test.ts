// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {ArchiveAdminAuditCases} from '@app/api/admin/tests/audit_coverage/ArchiveAdminAuditCases';

describeAdminAuditCoverage('ArchiveAdminController', ArchiveAdminAuditCases);
