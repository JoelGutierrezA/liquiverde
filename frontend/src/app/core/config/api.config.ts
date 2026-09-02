const LOCAL_API_BASE_URL = 'http://localhost:3000/api';
const PRODUCTION_API_BASE_URL = '/api';

export const API_BASE_URL = isLocalBrowser() ? LOCAL_API_BASE_URL : PRODUCTION_API_BASE_URL;

function isLocalBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}
