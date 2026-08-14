/**
 * Shared TypeScript types not owned by a single feature module.
 *
 * Kept empty in Phase 1 on purpose — types get added here as soon as a
 * second feature needs to share one (e.g. a common Pagination<T> shape).
 * Feature-local types belong inside that feature's folder, not here.
 */
export type Pagination<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
