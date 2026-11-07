// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {DiscoveryAdminAuditCases} from '@app/api/admin/tests/audit_coverage/DiscoveryAdminAuditCases';

describeAdminAuditCoverage('DiscoveryAdminController', DiscoveryAdminAuditCases);
