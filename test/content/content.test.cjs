// The page says what src/data/translations.json says, in each language. The wording itself is reviewed in that
// file; these check it all reaches the page. Queries go by element and lang attribute rather than by class,
// so they hold however the language switch is built.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { html, loadPage, text, langOf } = require('../helpers/page.cjs');
const translations = require('../../src/data/translations.json');
const { createTranslator } = require('../../build.cjs');

const { document } = loadPage().window;
const t = createTranslator(translations);
// Text govuk-frontend's components add themselves: the logo's label
const componentCopy = ['GOV.UK'];

/** Text of the elements matching `selector`, with the language each is in */
const byLang = (selector) => Array.from(document.querySelectorAll(selector), (el) => [langOf(el), text(el)]);

test('defaults to English with a UTF-8 charset', () => {
    assert.equal(document.documentElement.getAttribute('lang'), 'en');
    assert.equal(document.characterSet, 'UTF-8');
});

test('has the English title', () => {
    assert.equal(document.title, t('en', 'pageTitle'));
});

test('has the heading in English and Welsh', () => {
    assert.deepEqual(byLang('main h1'), [
        ['en', t('en', 'heading')],
        ['cy', t('cy', 'heading')],
    ]);
});

test('has the message in English and Welsh', () => {
    const message = (lang) => [
        [lang, t(lang, 'subHeading')],
        [lang, t(lang, 'useLater')],
        [lang, `${t(lang, 'contact')} ${t(lang, 'contactEmail')}`],
    ];
    assert.deepEqual(byLang('main p'), [...message('en'), ...message('cy')]);
});

test('links the contact address in both languages, showing the address it emails', () => {
    const links = Array.from(document.querySelectorAll('main a[href^="mailto:"]'), (a) => [langOf(a), a.getAttribute('href'), text(a)]);
    assert.deepEqual(
        links,
        ['en', 'cy'].map((lang) => [lang, `mailto:${t(lang, 'contactEmail')}`, t(lang, 'contactEmail')])
    );
});

test('has one main landmark that the skip link targets', () => {
    assert.equal(document.querySelectorAll('main').length, 1);
    assert.equal(document.querySelector('main').id, 'main-content');
    assert.equal(document.querySelector('.govuk-skip-link').getAttribute('href'), '#main-content');
});

test('names the service in English and Welsh', () => {
    const name = text(document.querySelector('.govuk-service-navigation__service-name'));
    assert.ok(name.startsWith(t('en', 'serviceName')), name);
    assert.ok(name.includes(t('cy', 'serviceName')), name);
});

test('all the copy comes from translations.json', () => {
    // Every piece of text in a translation, split at its links the way the page renders it
    const copy = new Set(componentCopy);
    const addPieces = (value) => {
        if (typeof value !== 'string') {
            return Object.values(value).forEach(addPieces);
        }
        const fragment = document.createElement('template');
        fragment.innerHTML = value;
        const walker = document.createTreeWalker(fragment.content, document.defaultView.NodeFilter.SHOW_TEXT);
        for (let node; (node = walker.nextNode()); ) {
            copy.add(node.nodeValue.replace(/\s+/g, ' ').trim());
        }
    };
    addPieces(translations);

    const walker = document.createTreeWalker(document.body, document.defaultView.NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
        const piece = node.nodeValue.replace(/\s+/g, ' ').trim();
        if (piece && !node.parentElement.closest('script, style')) {
            assert.ok(copy.has(piece), `not in translations.json: "${piece}"`);
        }
    }
    for (const el of document.querySelectorAll('[aria-label]')) {
        assert.ok(copy.has(el.getAttribute('aria-label')), `aria-label not in translations.json: "${el.getAttribute('aria-label')}"`);
    }
});

test('has no unrendered template syntax', () => {
    // Minified CSS legitimately contains "}}", so check the markup only
    const markup = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g, '');
    assert.doesNotMatch(markup, /\{\{|\}\}|\{%|%\}|\{#|#\}/);
});