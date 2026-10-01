import { getApiBase } from '../context/CanteenContext';

/**
 * Returns a displayable image URL. If the image is a remote URL (e.g. Wikimedia, Bing, external HTTP/HTTPS),
 * it proxies the image through backend /api/image-proxy to bypass CORS, hotlinking, and header restrictions.
 */
export const getDisplayImageUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Data URLs, Blob URLs, local File URIs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return trimmed;
  }

  // Already proxied
  if (trimmed.includes('/api/image-proxy') || trimmed.includes('/image-proxy')) {
    return trimmed;
  }

  // External web URLs requiring proxy
  if (
    trimmed.includes('wikimedia.org') ||
    trimmed.includes('wikipedia.org') ||
    trimmed.includes('bing.net') ||
    trimmed.includes('gstatic.com') ||
    trimmed.includes('unsplash.com') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    try {
      const base = getApiBase();
      if (base) {
        const separator = base.endsWith('/') ? '' : '/';
        return `${base}${separator}api/image-proxy?url=${encodeURIComponent(trimmed)}`;
      }
    } catch {}
  }
  return trimmed;
};
