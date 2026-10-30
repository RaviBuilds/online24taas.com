// Public Sanity env (project id + dataset are NOT secrets).
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-10-14';

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'mkiaioc7';

if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID');
}
