import {
  parse,
  serialize,
  type DefaultTreeAdapterTypes,
} from 'parse5';

function setAttribute(
  element: DefaultTreeAdapterTypes.Element,
  name: string,
  value: string,
): void {
  const attribute = element.attrs.find((item) => item.name === name);
  if (attribute) {
    attribute.value = value;
  } else {
    element.attrs.push({ name, value });
  }
}

function walkElements(
  node: DefaultTreeAdapterTypes.Node,
  visit: (element: DefaultTreeAdapterTypes.Element) => void,
): void {
  if ('tagName' in node) {
    visit(node);
  }

  if ('childNodes' in node) {
    for (const child of node.childNodes) {
      walkElements(child, visit);
    }
  }

  if ('content' in node && node.tagName === 'template') {
    walkElements(node.content, visit);
  }
}

export function addHtmlNonces(html: string, nonce: string): string {
  const document = parse(html);
  const angularRoots: DefaultTreeAdapterTypes.Element[] = [];

  walkElements(document, (element) => {
    if (element.tagName === 'app-root') {
      angularRoots.push(element);
    }

    if (
      element.tagName === 'script' &&
      !element.attrs.some((attribute) => attribute.name === 'src')
    ) {
      setAttribute(element, 'nonce', nonce);
    }

    if (element.tagName === 'style') {
      setAttribute(element, 'nonce', nonce);
    }
  });

  if (angularRoots.length !== 1) {
    throw new Error(
      `Expected exactly one Angular application root, found ${angularRoots.length}.`,
    );
  }

  setAttribute(angularRoots[0], 'ngcspnonce', nonce);
  return serialize(document);
}
