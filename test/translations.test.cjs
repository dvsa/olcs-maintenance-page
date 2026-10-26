// The copy in src/data/translations.json: complete in every language, and HTML only where the template expects it
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const translations = require('../src/data/translations.json');
const { createTranslator } = require('../build.cjs');

// The only keys whose copy is HTML, and so the only ones the template outputs unescaped
const htmlKeys = ['footer.licenceDescription'];
// Copy that's rightly the same in every language
const sameInEveryLanguage = ['contactEmail'];

/** Every leaf key in a nested copy object, as dotted paths */
const keysOf = (node, prefix = '') =>
    Object.entries(node).flatMap(([key, value]) =>
        typeof value === 'object' && value !== null ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
    );
const languages = Object.keys(translations);
const t = createTranslator(translations);
const links = (html) => Array.from(JSDOM.fragment(html).querySelectorAll('*'));

test('has English and Welsh', () => {
    assert.deepEqual(languages, ['en', 'cy']);
});

test('every language has the same keys', () => {
    for (const lang of languages) {
        assert.deepEqual(keysOf(translations[lang]).sort(), keysOf(translations.en).sort(), lang);
    }
});

test('every key has non-empty copy', () => {
    for (const lang of languages) {
        for (const key of keysOf(translations[lang])) {
            assert.equal(typeof t(lang, key), 'string', `${lang} ${key}`);
            assert.notEqual(t(lang, key).trim(), '', `${lang} ${key}`);
        }
    }
});

test('nothing is left untranslated', () => {
    for (const key of keysOf(translations.en).filter((k) => !sameInEveryLanguage.includes(k))) {
        assert.notEqual(t('cy', key), t('en', key), key);
    }
});

test('page titles follow the GOV.UK format', () => {
    for (const lang of languages) {
        assert.match(t(lang, 'pageTitle'), /^[^–]+ – [^–]+ – GOV\.UK$/, lang);
    }
});

test('the contact address is a plain email address', () => {
    for (const lang of languages) {
        assert.match(t(lang, 'contactEmail'), /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/, lang);
    }
});

test('only the allowlisted keys contain HTML', () => {
    // Also what makes the inline script safe: copy it embeds as JSON can't contain "</script>"
    for (const lang of languages) {
        for (const key of keysOf(translations[lang]).filter((k) => !htmlKeys.includes(k))) {
            assert.doesNotMatch(t(lang, key), /[<>]/, `${lang} ${key}`);
        }
    }
});

test('HTML copy only uses links, with a known set of attributes', () => {
    const allowed = ['class', 'href', 'hreflang', 'lang', 'rel'];
    for (const lang of languages) {
        for (const key of htmlKeys) {
            for (const el of links(t(lang, key))) {
                assert.equal(el.localName, 'a', `${lang} ${key}`);
                for (const attr of el.getAttributeNames()) {
                    assert.ok(allowed.includes(attr), `${lang} ${key}: ${attr}`);
                }
            }
        }
    }
});

test('HTML copy only links to https', () => {
    for (const lang of languages) {
        for (const key of htmlKeys) {
            const hrefs = links(t(lang, key)).map((a) => a.getAttribute('href'));
            assert.ok(hrefs.length > 0, `${lang} ${key}`);
            for (const href of hrefs) {
                assert.match(href, /^https:\/\//, `${lang} ${key}`);
            }
        }
    }
});