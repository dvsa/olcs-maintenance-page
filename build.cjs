// Builds index.html from src/index.njk with GOV.UK Frontend's page template, inlining every asset the CSS needs:
// the page is served on its own, so any other file it asked for would come back as this page.
// Run it directly (npm run build); the tests require it for its functions.
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const govukDist = path.join(path.dirname(require.resolve('govuk-frontend/package.json')), 'dist');
const govuk = path.join(govukDist, 'govuk');
const version = require('govuk-frontend/package.json').version;
const defaultOutFile = path.join(__dirname, 'index.html');

/** Reads a file from govuk-frontend's dist/govuk folder (a Buffer unless an encoding is given) */
const govukFile = (file, encoding) => fs.readFileSync(path.join(govuk, file), encoding);

/** Replaces `pattern` in `str`, failing unless it occurs exactly `count` times */
const replaceExactly = (str, pattern, count, replacer) => {
    // Count every occurrence, even for a non-global pattern: str.match() would return its capture groups instead
    const everywhere = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    const found = [...str.matchAll(everywhere)].length;
    if (found !== count) {
        throw new Error(`expected ${count} matches of ${pattern}, found ${found}`);
    }
    return str.replace(pattern, replacer);
};

/**
 * Makes govuk-frontend.min.css self-contained, reading the fonts and crest through `readAsset`.
 * The expected counts are what govuk-frontend 6 uses; if an upgrade changes them, this fails rather than guessing.
 */
const inlineCss = (css, readAsset = govukFile) => {
    const b64 = (file) => readAsset(file).toString('base64');

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
    return css;
};

/** Renders the page as a string */
const render = () => {
    const env = nunjucks.configure([path.join(__dirname, 'src'), govukDist], { autoescape: true, throwOnUndefined: true });
    return env
        .render('index.njk', {
            css: inlineCss(govukFile('govuk-frontend.min.css', 'utf8')),
            faviconDataUri: 'data:image/svg+xml;base64,' + govukFile('assets/images/favicon.svg').toString('base64'),
            govukFrontendVersion: version,
        })
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n');
};

/** Writes the rendered page to `outFile` and returns it */
const build = (outFile = defaultOutFile) => {
    const html = render();
    fs.writeFileSync(outFile, html);
    return html;
};

module.exports = { govukFile, replaceExactly, inlineCss, render, build, defaultOutFile };

if (require.main === module) {
    const html = build();
    console.log(`govuk-frontend ${version}: wrote ${defaultOutFile} (${html.length} bytes)`);
}