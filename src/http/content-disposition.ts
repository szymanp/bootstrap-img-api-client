/** `Content-Disposition` (RFC 6266) formatting for uploads that carry a file name. */

/**
 * Format `attachment; filename="…"` for `filename`. A name that isn't plain
 * printable ASCII also gets an RFC 8187 `filename*=UTF-8''…` parameter, which
 * the server prefers; the quoted `filename` then carries an ASCII fallback.
 */
export function formatContentDisposition(filename: string): string {
  const ascii = /^[\x20-\x7e]*$/.test(filename);
  const fallback = (ascii ? filename : filename.replace(/[^\x20-\x7e]/g, '_')).replace(/["\\]/g, '\\$&');
  const value = `attachment; filename="${fallback}"`;
  return ascii ? value : `${value}; filename*=UTF-8''${encodeExtValue(filename)}`;
}

/** Percent-encode everything outside RFC 8187's `attr-char`. */
function encodeExtValue(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
