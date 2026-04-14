/**
 * Role-Based Access Control — single source of truth.
 *
 * Roles:
 *  admin   → full access to everything
 *  viewer  → read-only (PNB Checker) — can see but cannot act
 *  auditor → viewer + Reports (can download reports)
 *  itadmin → viewer + Vulnerability Scan + Settings + Scan trigger
 */

// Feature keys map 1-to-1 with sidebar nav paths / features
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard',
    'assets',
    'asset-inventory',
    'security',
    'vulnerability-scan',
    'cbom',
    'cyber-rating',
    'analytics',
    'reports',
    'settings',
    'threat-surface',
    'scan',        // scan trigger button
  ],
  viewer: [
    'dashboard',
    'assets',
    'asset-inventory',
    'security',
    'cbom',
    'cyber-rating',
    'analytics',
    'threat-surface',
  ],
  auditor: [
    'dashboard',
    'assets',
    'asset-inventory',
    'security',
    'cbom',
    'cyber-rating',
    'analytics',
    'reports',     // auditor can view & download reports
    'threat-surface',
  ],
  itadmin: [
    'dashboard',
    'assets',
    'asset-inventory',
    'security',
    'vulnerability-scan',  // IT Admin can run vulnerability scans
    'cbom',
    'cyber-rating',
    'analytics',
    'settings',            // IT Admin can access settings
    'threat-surface',
    'scan',                // scan trigger button
  ],
};

/**
 * Returns true if the given role has access to the given feature.
 * Defaults to viewer behaviour for unknown/null roles.
 * @param {string|null|undefined} role
 * @param {string} feature
 * @returns {boolean}
 */
export function canAccess(role, feature) {
  const normalizedRole = role && ROLE_PERMISSIONS[role] ? role : 'viewer';
  return ROLE_PERMISSIONS[normalizedRole].includes(feature);
}

/**
 * Returns a human-readable label for a role value.
 */
export function getRoleLabel(role) {
  const labels = {
    admin: 'Administrator',
    viewer: 'PNB Checker',
    auditor: 'Compliance Auditor',
    itadmin: 'IT Administrator',
  };
  return labels[role] || role || 'Unknown';
}

export { ROLE_PERMISSIONS };
