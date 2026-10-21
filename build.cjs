// Builds index.html from src/index.njk with GOV.UK Frontend's page template, inlining every asset the CSS needs:
// the page is served on its own, so any other file it asked for would come back as this page.
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const govukDist = path.join(path.dirname(require.resolve('govuk-frontend/package.json')), 'dist');
const govuk = path.join(govukDist, 'govuk');
const version = require('govuk-frontend/package.json').version;
const outFile = path.join(__dirname, 'index.html');

const b64 = (file) => fs.readFileSync(path.join(govuk, file)).toString('base64');
const replaceExactly = (str, pattern, count, replacer) => {
    const found = str.match(pattern) || [];
    if (found.length !== count) {
        throw new Error(`expected ${count} matches of ${pattern}, found ${found.length}`);
    }
    return str.replace(pattern, replacer);
};

let css = fs.readFileSync(path.join(govuk, 'govuk-frontend.min.css'), 'utf8');
css = css.replace(/\/\*# sourceMappingURL=[^*]*\*\/\s*$/, '');
// @charset must come first and means nothing in an inline <style>; the page itself is UTF-8
css = replaceExactly(css, /^@charset "UTF-8";/, 1, '');

// Keep only the woff2 source of each font face, as a data URI
css = replaceExactly(
    css,
    /url\(\/assets\/fonts\/([\w-]+\.woff2)\) format\("woff2"\),url\(\/assets\/fonts\/[\w-]+\.woff\) format\("woff"\)/g,
    2,
    (_, woff2) => `url(data:font/woff2;base64,${b64('assets/fonts/' + woff2)}) format("woff2")`
);

// The crest is used three times, so define it once
css = replaceExactly(css, /url\(\/assets\/images\/govuk-crest\.svg\)/g, 3, 'var(--app-govuk-crest)');
css = `:root{--app-govuk-crest:url(data:image/svg+xml;base64,${b64('assets/images/govuk-crest.svg')})}` + css;

const leftover = css.match(/url\((?!data:)[^)]*\)/g);
if (leftover) {
    throw new Error('unexpected external url() left in CSS: ' + leftover.join(', '));
}

const env = nunjucks.configure([path.join(__dirname, 'src'), govukDist], { autoescape: true, throwOnUndefined: true });
const html = env
    .render('index.njk', {
        css,
        faviconDataUri: 'data:image/svg+xml;base64,' + b64('assets/images/favicon.svg'),
        govukFrontendVersion: version,
    })
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(outFile, html);
console.log(`govuk-frontend ${version}: wrote ${outFile} (${html.length} bytes)`);
