// Shared helpers for the tests that check the built page: the committed index.html, which the build test
// keeps in step with src/
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { defaultOutFile } = require('../../build.cjs');

const html = fs.readFileSync(defaultOutFile, 'utf8');

/**
 * Parses the page into a fresh DOM, so tests can't leak state into each other.
 * `url` is the page's address; anything else goes to jsdom. Scripts don't run unless `runScripts` is set.
 */
const loadPage = ({ url = 'https://maintenance.test/', ...options } = {}) => new JSDOM(html, { url, ...options });

/** Text content with whitespace collapsed, as a reader would see it */
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

/** The language an element is in: the nearest lang attribute, up to and including <html> */
const langOf = (el) => el.closest('[lang]')?.getAttribute('lang');

module.exports = { loadPage, text, langOf };