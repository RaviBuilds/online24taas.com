// Public Sanity identifiers (project id + dataset are NOT secrets). Defaults point at the intended
// production project; local/preview environments override them via NEXT_PUBLIC_* variables.
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-02-19';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'mkiaioc7';
