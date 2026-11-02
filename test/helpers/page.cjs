// Shared helpers for the tests that check the built page. The page is rendered in memory, the same way
// npm run build renders it (the build test checks that), so the tests need no build first
const { JSDOM } = require('jsdom');
const { render } = require('../../build.cjs');

const html = render();

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