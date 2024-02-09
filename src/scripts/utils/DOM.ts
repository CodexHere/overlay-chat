export const AddStylesheet = (href: string) => {
  const head = globalThis.document.getElementsByTagName('head')[0];
  const link = globalThis.document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  link.setAttribute('data-plugin', 'true');

  head.appendChild(link);
};

export function IsInViewPort(element: HTMLElement, container: HTMLElement = globalThis.document.body) {
  const { bottom: elementBottom, top: elementTop } = element.getBoundingClientRect();
  const { bottom: containerBottom, top: containerTop } = container.getBoundingClientRect();

  // Check if the element is fully or partially visible in the container
  return elementTop >= containerTop && elementBottom <= containerBottom;
}
