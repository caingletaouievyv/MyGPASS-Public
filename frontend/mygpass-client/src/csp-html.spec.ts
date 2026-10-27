import { describe, expect, it } from 'vitest';

import { addHtmlNonces } from './csp-html';

describe('addHtmlNonces', () => {
  it('adds the nonce to the Angular root and all inline scripts and styles', () => {
    const html = addHtmlNonces(
      '<html><head><style nonce="old">.app { color: red }</style></head><body>' +
        '<app-root ngCspNonce="old"></app-root><script nonce="old">startApp()</script>' +
        '<script src="/main.js"></script></body></html>',
      'test-nonce',
    );

    expect(html).toContain('<app-root ngcspnonce="test-nonce">');
    expect(html).toContain('<style nonce="test-nonce">');
    expect(html).toContain('<script nonce="test-nonce">startApp()</script>');
    expect(html).toContain('<script src="/main.js"></script>');
    expect(html.match(/\bnonce=/g)).toHaveLength(2);
  });

  it('does not rewrite tag-like text inside comments or inline script content', () => {
    const html = addHtmlNonces(
      '<html><body><!-- <app-root> --><app-root></app-root>' +
        '<script>const example = "<style>";</script></body></html>',
      'safe-nonce',
    );

    expect(html).toContain('const example = "<style>";');
    expect((html.match(/<style\b[^>]*\bnonce=/gi) ?? [])).toHaveLength(0);
    expect(html).toContain('<app-root ngcspnonce="safe-nonce">');
  });

  it.each([
    ['missing', '<html><body></body></html>'],
    ['duplicate', '<html><body><app-root></app-root><app-root></app-root></body></html>'],
  ])('rejects %s Angular root markup', (_description, html) => {
    expect(() => addHtmlNonces(html, 'test-nonce'))
      .toThrow(/Expected exactly one Angular application root/);
  });
});
