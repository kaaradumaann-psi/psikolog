/**
 * Bundlers (Vite natively, esbuild through scripts/build.mjs) resolve the `?raw`
 * suffix to the file's UTF-8 text. TypeScript has no built-in notion of it, so the
 * suffix is declared here once instead of per import site.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}

/**
 * `?inline` forces a base64 data URI in both bundlers (Vite natively, esbuild via
 * scripts/build.mjs). Without it Vite would emit a separate asset URL and the
 * self-contained optik-form.html would have a dead link.
 */
declare module '*.pdf?inline' {
  const dataUrl: string;
  export default dataUrl;
}
