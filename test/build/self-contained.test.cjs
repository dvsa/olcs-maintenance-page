// The page is served on its own, and during a gateway error it's served at the broken app's own URL.
// Any other request it makes (a stylesheet, a font, an image) goes to that broken app, so the page must
// contain everything it needs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadPage } = require('../helpers/page.cjs');

const { document } = loadPage().window;

/** Every piece of CSS in the page: <style> blocks and style attributes */
const allCss = () => [
    ...Array.from(document.querySelectorAll('style'), (el) => el.textContent),
    ...Array.from(document.querySelectorAll('[style]'), (el) => el.getAttribute('style')),
];

test('loads no external scripts', () => {
    assert.deepEqual(Array.from(document.querySelectorAll('script[src]'), (el) => el.getAttribute('src')), []);
});

test('has no <link> other than a data: URI favicon', () => {
    const links = Array.from(document.querySelectorAll('link'), (el) => [el.rel, el.getAttribute('href').slice(0, 26)]);
    assert.deepEqual(links, [['icon', 'data:image/svg+xml;base64,']]);
});

test('loads no images or embedded content except as data: URIs', () => {
    const external = Array.from(document.querySelectorAll('[src], [srcset], [poster], object[data]'))
        .flatMap((el) => ['src', 'srcset', 'poster', 'data'].map((attr) => el.getAttribute(attr)))
        .filter((value) => value !== null && !value.startsWith('data:'));
    assert.deepEqual(external, []);
});

test('CSS only uses data: URIs and imports nothing', () => {
    for (const css of allCss()) {
        assert.equal(css.match(/url\(\s*(?!['"]?data:)[^)]*\)/g), null);
        assert.doesNotMatch(css, /@import/);
    }
});

test('links only to fragments, https and mailto', () => {
    // A relative or protocol-relative link would go to the broken app, or over http on an http request
    const knownExceptions = [
        // The footer language toggle: replaced by a #cy fragment link when the switch moves to CSS
        '?lang=cy',
    ];
    const bad = Array.from(document.querySelectorAll('a[href], area[href]'), (el) => el.getAttribute('href'))
        .filter((href) => !/^(#|https:\/\/|mailto:)/.test(href) && !knownExceptions.includes(href));
    assert.deepEqual(bad, []);
});

test('has no <base>, refresh, manifest, form or frame that could send a request', () => {
    assert.equal(document.querySelector('base, meta[http-equiv="refresh" i], link[rel="manifest"], form, iframe, frame'), null);
});