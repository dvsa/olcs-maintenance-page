// What the page says, in each language. Queries go by element and lang attribute rather than by class,
// so they hold however the language switch is built.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { html, loadPage, text, langOf } = require('./helpers/page.cjs');

const { document } = loadPage().window;
const email = 'notifications@vehicle-operator-licensing.service.gov.uk';

/** Text of the elements matching `selector`, with the language each is in */
const byLang = (selector) => Array.from(document.querySelectorAll(selector), (el) => [langOf(el), text(el)]);

test('defaults to English with a UTF-8 charset', () => {
    assert.equal(document.documentElement.getAttribute('lang'), 'en');
    assert.equal(document.characterSet, 'UTF-8');
});

test('has a GOV.UK-format title', () => {
    assert.equal(document.title, 'Service unavailable – Vehicle Operator Licensing – GOV.UK');
});

test('has the heading in English and Welsh', () => {
    assert.deepEqual(byLang('main h1'), [
        ['en', 'Service unavailable'],
        ['cy', 'Gwasanaeth ddim ar gael'],
    ]);
});

test('has the message in English and Welsh', () => {
    assert.deepEqual(byLang('main p'), [
        ['en', 'We are carrying out routine maintenance and improvements.'],
        ['en', 'You will be able to use the service later.'],
        ['en', `If you see this page outside of times previously advertised please contact ${email}`],
        ['cy', 'Rydym yn cynnal gwaith cynnal a chadw a gwelliannau arferol.'],
        ['cy', "Byddwch yn gallu defnyddio'r gwasanaeth yn nes ymlaen."],
        ['cy', `Os gwelwch y dudalen hon y tu allan i weithiau a hysbysebwyd yn flaenorol, cysylltwch â ${email}`],
    ]);
});

test('links the contact address in both languages', () => {
    const links = Array.from(document.querySelectorAll('main a[href^="mailto:"]'), (a) => [a.getAttribute('href'), text(a)]);
    assert.deepEqual(links, [
        [`mailto:${email}`, email],
        [`mailto:${email}`, email],
    ]);
});

test('has one main landmark that the skip link targets', () => {
    assert.equal(document.querySelectorAll('main').length, 1);
    assert.equal(document.querySelector('main').id, 'main-content');
    assert.equal(document.querySelector('.govuk-skip-link').getAttribute('href'), '#main-content');
});

test('names the service in English and Welsh', () => {
    const name = text(document.querySelector('.govuk-service-navigation__service-name'));
    assert.ok(name.startsWith('Vehicle Operator Licensing'), name);
    assert.ok(name.includes('Trwyddedu Gweithredu Cerbydau'), name);
});

test('has no unrendered template syntax', () => {
    // Minified CSS legitimately contains "}}", so check the markup only
    const markup = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g, '');
    assert.doesNotMatch(markup, /\{\{|\}\}|\{%|%\}|\{#|#\}/);
});