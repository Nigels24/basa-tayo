/**
 * Cloudinary settings from the environment. The secret stays on the server:
 * the browser only ever gets a signature for one upload.
 */
export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** A delivery URL from our own Cloudinary account, e.g. https://res.cloudinary.com/<cloud>/image/upload/... */
export function isOurCloudinaryUrl(url: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && u.pathname.startsWith(`/${cloudName}/`);
}
