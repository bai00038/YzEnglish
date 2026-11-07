export function responsiveImageProps(src: string, _sizes: string) {
  // Keep the original OSS object as the browser source. Runtime OSS image
  // processing currently returns transformed WebP bytes with the original
  // JPEG content type on this custom domain, which some browsers refuse to
  // decode. Section-level lazy rendering and native image lazy-loading still
  // prevent the explore page from requesting every cover at startup.
  return { src };
}
