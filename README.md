## VOL Maintenance Page

This page is served via imperva when routine maintenance and upgrades are carried out on a live release.

`index.html` is the page that gets deployed. It is a single self-contained file: the GOV.UK Frontend CSS, the GDS Transport fonts and the crest are all inlined, because the page is served on its own and any other file it asked for would come back as the page itself.

English and Welsh content are both in the page; the Cymraeg/English link in the footer switches between them (`?lang=cy` / `?lang=en`, remembered for the browser session).

### Changing the page

Don't edit `index.html` by hand. Edit the source and rebuild:

- **Wording:** `src/data/translations.json`. Every string on the page is there, in English (`en`) and Welsh (`cy`), with the same keys in each. Only `footer.licenceDescription` may contain HTML.
- **Layout:** `src/index.njk`. It extends GOV.UK Frontend's page template and looks all its copy up with `t(lang, key)`, so it has no text of its own. A missing key fails the build.

The build needs Node 26 (pinned in `.nvmrc`); `npm ci` refuses to run on any other major version:

```bash
nvm use   # or: fnm use
npm ci
npm run build
```

Commit the rebuilt `index.html` with the template change, then run the tests:

```bash
npm test
```

The tests use Node's built-in test runner, with jsdom to read the built page. They check that:
- the build inlines everything GOV.UK Frontend's CSS needs, and fails on anything it doesn't know how to inline;
- the committed `index.html` matches a fresh build of `src/`;
- the page makes no other requests and only links to fragments, https and mailto;
- the translations are complete: the same keys in both languages, nothing left untranslated, and HTML only where it's allowed;
- the page shows the copy from `translations.json` in English and Welsh, and no text that isn't from there;
- axe-core finds no WCAG 2.2 A or AA violations in either language.

The accessibility checks are a guard against regressions, not a sign-off. Automated tools only find some accessibility problems, and jsdom doesn't render, so axe can't judge anything visual such as colour contrast; `npm test` lists what it couldn't check. Changes to the page still need checking with a keyboard and a screen reader.

To move to a newer GOV.UK Frontend, update `govuk-frontend` in `package.json` and rebuild; the build fails if the CSS starts referencing an asset it doesn't know how to inline.

Maintained by the VOL CI development team.
