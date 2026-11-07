// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {VoiceAdminAuditCases} from '@app/api/admin/tests/audit_coverage/VoiceAdminAuditCases';

describeAdminAuditCoverage('VoiceAdminController', VoiceAdminAuditCases);
