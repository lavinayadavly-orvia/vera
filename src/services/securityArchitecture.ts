import type { SecurityArchitectureSummary } from '@/types';

export function buildSecurityArchitecture(): SecurityArchitectureSummary {
  return {
    ssoRequired: true,
    approvalModel: 'strict-rbac',
    zeroDataRetentionPolicy: 'required',
    workflowIsolation: 'medical-vs-marketing',
    translationPolicy: 'Use approved clinical terminology by market and locale. Canadian French and France French must remain distinct approval tracks.',
    roles: [
      {
        role: 'writer',
        canApprove: false,
        permissions: ['create-draft', 'edit-content', 'request-review'],
      },
      {
        role: 'reviewer',
        canApprove: false,
        permissions: ['comment', 'flag-risk', 'return-for-revision'],
      },
      {
        role: 'approver',
        canApprove: true,
        permissions: ['approve', 'withdraw', 'release-to-veeva'],
      },
      {
        role: 'admin',
        canApprove: true,
        permissions: ['manage-roles', 'configure-sso', 'audit-export', 'approve'],
      },
    ],
  };
}
