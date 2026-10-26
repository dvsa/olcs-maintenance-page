// Unit tests for build.cjs. The inlining is deliberately strict: a govuk-frontend upgrade that changes how its CSS
// references fonts or images must fail the build, rather than ship a page that requests them.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { replaceExactly, inlineCss, govukFile, render, build, defaultOutFile } = require('../build.cjs');

/** Stands in for govuk-frontend's assets: each file's content is its own path, so the data URIs are predictable */
const fakeAsset = (file) => Buffer.from(file);
const b64 = (str) => Buffer.from(str).toString('base64');

/** A minimal stand-in for govuk-frontend.min.css, with the same asset references the real one has */
const fixtureCss = () =>
    '@charset "UTF-8";' +
    '@font-face{font-family:"GDS Transport";src:url(/assets/fonts/light-94a07e06a1-v2.woff2) format("woff2"),url(/assets/fonts/light-f591b13f7d-v2.woff) format("woff")}' +
    '@font-face{font-family:"GDS Transport";src:url(/assets/fonts/bold-b542beb274-v2.woff2) format("woff2"),url(/assets/fonts/bold-affa96571d-v2.woff) format("woff")}' +
    '.a{background-image:url(/assets/images/govuk-crest.svg)}.b{mask-image:url(/assets/images/govuk-crest.svg)}.c{background:url(/assets/images/govuk-crest.svg)}' +
    '\n/*# sourceMappingURL=govuk-frontend.min.css.map */\n';

test('replaceExactly replaces when the count matches', () => {
    assert.equal(replaceExactly('a-b-a', /a/g, 2, 'c'), 'c-b-c');
    assert.equal(replaceExactly('a-b', /a/, 1, 'c'), 'c-b');
});

test('replaceExactly throws when there are fewer or more matches than expected', () => {
    assert.throws(() => replaceExactly('a-b', /a/g, 2, 'c'), /expected 2 matches of \/a\/g, found 1/);
    assert.throws(() => replaceExactly('a-a-a', /a/g, 2, 'c'), /expected 2 matches of \/a\/g, found 3/);
    assert.throws(() => replaceExactly('b', /a/g, 1, 'c'), /expected 1 matches of \/a\/g, found 0/);
});

test('replaceExactly counts every occurrence of a non-global pattern, not its capture groups', () => {
    // String.prototype.match returns a non-global pattern's capture groups, not its occurrences
    assert.equal(replaceExactly('a-b', /a(-)/, 1, (_, dash) => `x${dash}`), 'x-b');
    // A non-global pattern only replaces the first occurrence, so a second one must fail rather than be left behind
    assert.throws(() => replaceExactly('a-a-', /a(-)/, 1, 'c'), /expected 1 matches of \/a\(-\)\/, found 2/);
    assert.throws(() => replaceExactly('a-a', /a/, 1, 'c'), /expected 1 matches of \/a\/, found 2/);
});

test('inlineCss drops @charset and the source map comment', () => {
    const css = inlineCss(fixtureCss(), fakeAsset);
    assert.doesNotMatch(css, /@charset|sourceMappingURL/);
});

test('inlineCss keeps only the woff2 source of each font, as a data URI', () => {
    const css = inlineCss(fixtureCss(), fakeAsset);
    for (const font of ['light-94a07e06a1-v2.woff2', 'bold-b542beb274-v2.woff2']) {
        assert.ok(css.includes(`src:url(data:font/woff2;base64,${b64('assets/fonts/' + font)}) format("woff2")}`), font);
    }
    assert.doesNotMatch(css, /\.woff\)|format\("woff"\)/);
});

test('inlineCss defines the crest once and uses it everywhere', () => {
    const css = inlineCss(fixtureCss(), fakeAsset);
    assert.ok(css.startsWith(`:root{--app-govuk-crest:url(data:image/svg+xml;base64,${b64('assets/images/govuk-crest.svg')})}`));
    assert.equal(css.match(/var\(--app-govuk-crest\)/g).length, 3);
    assert.equal(css.match(/data:image\/svg\+xml/g).length, 1);
});

test('inlineCss fails when the CSS references the fonts or crest a different number of times', () => {
    const extraFont = fixtureCss().replace('.a{', '@font-face{src:url(/assets/fonts/x.woff2) format("woff2"),url(/assets/fonts/x.woff) format("woff")}.a{');
    assert.throws(() => inlineCss(extraFont, fakeAsset), /expected 2 matches/);
    const fewerCrests = fixtureCss().replace('.c{background:url(/assets/images/govuk-crest.svg)}', '');
    assert.throws(() => inlineCss(fewerCrests, fakeAsset), /expected 3 matches/);
});

test('inlineCss fails on any other url() it does not know how to inline', () => {
    for (const ref of ['url(/assets/images/govuk-icon-180.png)', 'url("/x.png")', 'url(https://example.com/x.png)']) {
        const css = fixtureCss().replace('.a{', `.d{background:${ref}}.a{`);
        assert.throws(() => inlineCss(css, fakeAsset), /unexpected external url\(\) left in CSS/, ref);
    }
});

test('inlineCss leaves nothing external in the real govuk-frontend CSS', () => {
    const css = inlineCss(govukFile('govuk-frontend.min.css', 'utf8'));
    assert.equal(css.match(/url\((?!data:)[^)]*\)/g), null);
    assert.equal(css.match(/url\(data:font\/woff2;base64,/g).length, 2);
});

test('the committed index.html is up to date with src/', () => {
    // index.html is what gets deployed, so a template change must be committed with its rebuilt page.
    // assert.ok, not assert.equal, so a failure gives the fix rather than a diff of two 280KB strings.
    assert.ok(fs.readFileSync(defaultOutFile, 'utf8') === render(), 'index.html is out of date: run npm run build and commit it');
});

test('build writes the rendered page to the given file', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-page-build-'));
    try {
        const outFile = path.join(outDir, 'index.html');
        const html = build(outFile);
        assert.equal(fs.readFileSync(outFile, 'utf8'), html);
        assert.equal(html, render());
    } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
});