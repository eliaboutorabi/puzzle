// Everything is static: no server, no database. Photos never leave the device.
export const prerender = true;
export const ssr = false;

// Emit `play/index.html` rather than `play.html`. GitHub Pages happens to
// resolve the extensionless form, but directory-style output works on any
// static host, so the build does not depend on that behaviour.
export const trailingSlash = 'always';
