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
npm test                         # every suite
npm run test:build               # or one suite at a time
npm run test:content
npm run test:accessibility
```

The tests use Node's built-in test runner, with jsdom to read the built page. They're in three suites, one directory each under `test/`, so CI can run each suite as its own check and show at a glance which one failed:

- **Build** (`test/build/`): the build inlines everything GOV.UK Frontend's CSS needs, and fails on anything it doesn't know how to inline; the committed `index.html` matches a fresh build of `src/`; the page makes no other requests and only links to fragments, https and mailto.
- **Content** (`test/content/`): the translations are complete, with the same keys in both languages, nothing left untranslated, and HTML only where it's allowed; the page shows the copy from `translations.json` in English and Welsh, and no text that isn't from there.
- **Accessibility** (`test/accessibility/`): axe-core finds no WCAG 2.2 A or AA violations in either language (see [Accessibility](#accessibility)).

A new test file goes in the directory of the suite it belongs to. A test file anywhere else fails the build suite, because a CI check per suite would never run it.

To move to a newer GOV.UK Frontend, update `govuk-frontend` in `package.json` and rebuild; the build fails if the CSS starts referencing an asset it doesn't know how to inline.

### Accessibility

The page must meet [WCAG 2.2 at level AA](https://www.gov.uk/service-manual/helping-people-to-use-your-service/understanding-wcag), the standard [the GDS Way](https://gds-way.digital.cabinet-office.gov.uk/manuals/accessibility.html) sets for government services. Public sector websites are legally required to be accessible ([accessibility requirements for public sector websites and apps](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps)), and that includes this page: it's what users see when the service is down.

`npm test` runs every axe-core rule for WCAG 2.2 A and AA against both the English and Welsh views, and fails if a newer axe-core adds rules for those levels that the tests don't run. That guards against regressions; it doesn't show the page is accessible:

- The GDS Way notes that automated testing only finds around 30% of likely accessibility problems.
- jsdom doesn't render, so axe can't judge anything visual, such as colour contrast. `npm test` lists what it couldn't check.

The page is built from GOV.UK Frontend's components and styles, unchanged, and we rely on them for their own accessibility, colour contrast included. The GOV.UK Design System team [aims for WCAG AA](https://design-system.service.gov.uk/accessibility/accessibility-strategy/#baseline-wcag-accessibility-compliance) and GOV.UK Frontend's components have been WCAG 2.2 AA compliant since version 5.0.0 (this page uses the version in `package.json`, which is later). Their [testing](https://design-system.service.gov.uk/accessibility/accessibility-strategy/#testing-accessibility-concerns) includes axe colour contrast checks in a real browser, and manual testing with assistive technologies. That doesn't cover how we use those components: as the Design System puts it, using it "does not immediately make that service accessible". Our copy, the page's structure, and any CSS or markup of our own (such as the language switch) are ours to check.

So a change to the page also needs checking by hand, with a keyboard and with the assistive technology and browser combinations in the Service Manual's [testing with assistive technologies](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies).

Maintained by the VOL CI development team.
