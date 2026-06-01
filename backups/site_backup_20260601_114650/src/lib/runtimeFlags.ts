export function isLocalDataFallbackEnabled() {
  const env = import.meta.env;

  if (env.VITE_USE_LOCAL_DATA_FALLBACK?.trim() === 'true') {
    return true;
  }

  if (env.MODE === 'test') {
    return true;
  }

  if (typeof window !== 'undefined' && Boolean((window as { Cypress?: unknown }).Cypress)) {
    return true;
  }

  return false;
}
