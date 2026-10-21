## VOL Maintenance Page

This page is served via imperva when routine maintenance and upgrades are carried out on a live release.

`index.html` is the page that gets deployed. It is a single self-contained file: the GOV.UK Frontend CSS, the GDS Transport fonts and the crest are all inlined, because the page is served on its own and any other file it asked for would come back as the page itself.

English and Welsh content are both in the page; the Cymraeg/English link in the footer switches between them (`?lang=cy` / `?lang=en`, remembered for the browser session).

### Changing the page

Don't edit `index.html` by hand. Edit `src/index.njk` and rebuild:

```bash
npm ci
npm run build
```

Commit the rebuilt `index.html` with the template change. To move to a newer GOV.UK Frontend, update `govuk-frontend` in `package.json` and rebuild; the build fails if the CSS starts referencing an asset it doesn't know how to inline.

Maintained by the VOL CI development team.
