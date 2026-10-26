// The t(lang, key) lookup the templates use to read src/data/translations.json
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTranslator } = require('../build.cjs');

const copy = { en: { a: 'A', b: { c: 'C' } } };

test('t() looks up top-level and nested keys', () => {
    const t = createTranslator(copy);
    assert.equal(t('en', 'a'), 'A');
    assert.equal(t('en', 'b.c'), 'C');
});

test('t() throws on a missing language or key, rather than rendering nothing', () => {
    const t = createTranslator(copy);
    assert.throws(() => t('cy', 'a'), /no cy translation for a/);
    assert.throws(() => t('en', 'missing'), /no en translation for missing/);
    // A key must lead to copy, not to a group of it or through it
    assert.throws(() => t('en', 'b'), /no en translation for b/);
    assert.throws(() => t('en', 'a.c'), /no en translation for a\.c/);
});

test('t() only finds the copy itself, not properties every object has', () => {
    const t = createTranslator(copy);
    for (const key of ['constructor', '__proto__', 'toString', 'a.length']) {
        assert.throws(() => t('en', key), /no en translation/, key);
    }
    assert.throws(() => t('toString', 'a'), /no toString translation/);
    // Copy inherited from a prototype isn't the copy's own, even when it's a string
    const inherits = createTranslator({ en: Object.assign(Object.create({ inherited: 'I' }), { a: 'A' }) });
    assert.throws(() => inherits('en', 'inherited'), /no en translation for inherited/);
});
