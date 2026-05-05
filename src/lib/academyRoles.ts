/**
 * Academy role helpers — single source of truth used across the UI.
 * Roles are stored in `user_academies.role` (text). The CHECK constraint
 * on that table is the authoritative list of allowed values.
 */

export const ACADEMY_STAFF_ROLES = [
  'head_of_academy',
  'academy_admin',
  'academy_coach',
  'academy_staff',
  'academy_welfare_officer',
  'welfare_officer',
  'physio',
  'scout',
  'analyst',
] as const;

export type AcademyRole = typeof ACADEMY_STAFF_ROLES[number];

/** Roles that can administer the academy itself (settings, members, links). */
export const ACADEMY_ADMIN_ROLES: AcademyRole[] = ['head_of_academy', 'academy_admin'];

/** Any non-null role implies "academy staff". */
export const isAcademyStaffRole = (role: string | null | undefined): boolean =>
  !!role && (ACADEMY_STAFF_ROLES as readonly string[]).includes(role);

export const isAcademyAdminRole = (role: string | null | undefined): boolean =>
  !!role && (ACADEMY_ADMIN_ROLES as string[]).includes(role);
