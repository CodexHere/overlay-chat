/**
 * Miscellaneous methods for interacting with the DOM
 *
 * @module
 */

/**
 * Adds a stylesheet `<Link>` tag to the Document Head.
 *
 * @param href - URL to Stylesheet.
 */
export const AddStylesheet = (href: string | URL) => {
  const head = globalThis.document.getElementsByTagName('head')[0];
  const link = globalThis.document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href instanceof URL ? href.href : href;

  head.appendChild(link);

  return link;
};

/**
 * Adds a Font Family to the DOM through a Font Provider.
 *
 * Font Family format examples:
 * - "verdana"
 * - "comic-sans"
 * - "some-font:400"
 * - "some-font:400,700"
 *
 * @param fontFamily - The Font Family string format to add.
 * @param provider - Which font provier to use for loading fonts. Defaults to {@link fonts.bunny.net}.
 */
export const AddFont = (fontFamily: string, provider: 'fonts.google.com' | 'fonts.bunny.net' = 'fonts.bunny.net') =>
  AddStylesheet(`https://${provider}/css?family=${fontFamily}`);

/**
 * Evaluates whether an Element is visibile within the Container's ViewwPort.
 *
 * @param element - Element to test if visible.
 * @param container - Element to test visibility within.
 */
export function IsInViewPort(element: HTMLElement, container: HTMLElement = globalThis.document.body): boolean {
  const { bottom: elementBottom, top: elementTop } = element.getBoundingClientRect();
  const { bottom: containerBottom, top: containerTop } = container.getBoundingClientRect();

  //TODO: Needs to eval left/right as well inside viewport
  // TODO: Should probably take in options (or at least bool param)
  //  like WHOLLY_IN_VIEWPORT or something
  // Check if the element is fully or partially visible in the container
  return elementTop >= containerTop && elementBottom <= containerBottom;
}
