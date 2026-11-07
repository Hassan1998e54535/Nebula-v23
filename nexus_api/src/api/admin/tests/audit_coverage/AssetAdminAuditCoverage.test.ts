// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {AssetAdminAuditCases} from '@app/api/admin/tests/audit_coverage/AssetAdminAuditCases';

describeAdminAuditCoverage('AssetAdminController', AssetAdminAuditCases);
