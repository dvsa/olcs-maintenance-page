// Automated accessibility checks with axe-core, in each language, against WCAG 2.2 AA: the standard the GDS Way
// sets for government services (https://gds-way.digital.cabinet-office.gov.uk/manuals/accessibility.html).
// jsdom doesn't render, so axe can't judge anything visual, such as colour contrast: it reports those as
// incomplete, and these tests list them rather than treat them as passed. Automated checks only find some
// accessibility problems; they guard against regressions, and don't replace testing with assistive technology.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const axe = require('axe-core');
const { VirtualConsole } = require('jsdom');
const { loadPage } = require('./helpers/page.cjs');

// WCAG 2.2 AA means every Level A and AA success criterion from WCAG 2.0, 2.1 and 2.2. axe tags its rules by
// the version and level that introduced them; it has no wcag22a tag, as none of 2.2's new A criteria can be
// automated. The test below fails if a newer axe adds one, so an upgrade can't quietly skip rules.
const wcag22aa = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('runs every axe rule for WCAG 2.2 A and AA, and none for AAA', () => {
    const levelTags = new Set(axe.getRules().flatMap((rule) => rule.tags.filter((tag) => /^wcag2[0-2]?a{1,3}$/.test(tag))));
    const required = [...levelTags].filter((tag) => !tag.endsWith('aaa')).sort();
    assert.deepEqual(required, [...wcag22aa].sort());
});

/**
 * Runs axe against the page at `url`. `runPageScripts` runs the page's own script first, as a browser would,
 * which is what shows the Welsh view for ?lang=cy. Fails on any error from jsdom or the page's script.
 */
const audit = async (url, runPageScripts) => {
    const virtualConsole = new VirtualConsole();
    virtualConsole.forwardTo(console, { jsdomErrors: 'none' });
    const errors = [];
    virtualConsole.on('jsdomError', (error) => {
        // axe probes <canvas>, which jsdom doesn't implement; that's expected, anything else isn't
        if (!/HTMLCanvasElement's getContext\(\)/.test(error.message)) {
            errors.push(error.message);
        }
    });
    const { window } = loadPage({ url, runScripts: runPageScripts ? 'dangerously' : 'outside-only', virtualConsole });
    window.eval(axe.source);
    const results = await window.axe.run(window.document, { runOnly: { type: 'tag', values: wcag22aa } });
    assert.deepEqual(errors, []);
    return results;
};

/**
 * A violation or incomplete result as one readable line per element. Array.from brings axe's results out of
 * jsdom's window into this realm, so assert.deepEqual compares them as ordinary arrays.
 */
const describe = (results) =>
    Array.from(results).flatMap((result) => Array.from(result.nodes, (node) => `${result.id}: ${node.target.join(' ')} (${result.help})`));

for (const [view, url, runPageScripts] of [
    ['English', 'https://maintenance.test/', false],
    ['Welsh', 'https://maintenance.test/?lang=cy', true],
]) {
    test(`the ${view} view has no WCAG 2.2 A or AA violations axe can detect`, async (t) => {
        const results = await audit(url, runPageScripts);
        assert.equal(results.testEngine.name, 'axe-core');
        assert.ok(results.passes.length > 0, 'axe ran no checks');
        assert.deepEqual(describe(results.violations), []);
        // Not a failure, but not a pass either: say what needs a real browser or a person
        for (const line of describe(results.incomplete)) {
            t.diagnostic(`needs checking in a browser: ${line}`);
        }
    });
}

test('the Welsh view really is in Welsh', async () => {
    // Guards the test above: if the page script stopped switching, it would audit English twice
    const { window } = loadPage({ url: 'https://maintenance.test/?lang=cy', runScripts: 'dangerously' });
    assert.equal(window.document.documentElement.lang, 'cy');
    assert.equal(window.document.querySelector('main [data-app-lang="en"]').hidden, true);
    assert.equal(window.document.querySelector('main [data-app-lang="cy"]').hidden, false);
});