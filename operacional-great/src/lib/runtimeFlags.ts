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

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
  }

  return false;
}
