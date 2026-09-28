# Site content (CMS source of truth)

All editable copy lives here as JSON, validated by `schema.ts`. The admin portal
edits these files and opens PRs; the Astro pages only read them.

```
src/content/
  schema.ts        zod schema. Shared: the admin app vendors it verbatim, so zod only
  index.ts         loader: getPage(slug), getGlobals(), section(), slots(), required()
  globals.json     site-wide content (footer)
  pages/<slug>.json  one file per extracted page
```

Extracted so far: `home` (/), `about` (/about), and the footer (`globals.json`).

## How a page reads content

```astro
---
import { getPage, required, section, slots } from '../content';

const page = getPage('about');                       // parses + validates the file
const story = section(page, 'story', 'text');        // typed; throws if missing or wrong type
const joinUs = section(page, 'join-us', 'cta');
const hero = section(page, 'hero', 'hero');
const [joinCta] = slots(joinUs.ctas, 1, 'about/join-us.ctas'); // fixed-slot list
const heroImage = required(hero.image, 'about/hero.image');    // optional in schema, needed here
---
<Layout title={page.title} description={page.description}>
```

Invalid content fails `astro build` with the file and field path, for example:
`Invalid content in src/content/pages/home.json: - sections.0.ctas.1.href: must be a root-relative path ...`

## Extraction rules

**1. Only literals move. Markup never changes.** Keep every element, class,
attribute, comment and the section order exactly as they are; replace each copy
literal with an expression in the same position. A literal that sat on its own
line becomes an expression on its own line; an inline literal becomes an inline
expression. Section reordering is not editable in v1.

**2. Sections.** Each page is `{ slug, title, description, sections[] }`. Every
section has `type` (a block type from `BLOCK_TYPES`), `id` and `label`.
- `id`: kebab-case, stable, unique per page. Name it after what the section *is*,
  usually its heading or the existing HTML `id`: `hero`, `products`, `who-we-help`,
  `final-cta`. Templates look sections up by id, so **never rename a shipped id**.
- `label`: what the admin shows in its section list ("Final CTA").
- One visual `<section>` can be several content sections when its parts are
  independent (about: `story`, `mission`, `vision` share one `<section>`).
- `title`/`description` are the `<Layout>` props (`<title>`, meta description).

**3. Block types.** Reuse an existing type when the shape fits. If a page needs a
field a type lacks, add it as **optional** (never make an existing field required,
it would invalidate other pages). Add a new type only for a genuinely different
shape: add it to `BLOCK_TYPES`, write `XBlockSchema = block('x', {...})`, and add it
to `SectionSchema`. Current vocabulary:

| type | used for |
| --- | --- |
| `hero` | eyebrow, heading, body, background `image`, `ctas`, optional event `promo` |
| `partners` | logo marquee (`logos`: name, tag, `logo` image or built-in `icon`, `scale`) |
| `split` | copy panel with heading + paragraphs over/next to an image |
| `showcase` | flagship product block (header row, flagship card, highlight card, tiles) |
| `products` | product cards (image, badge, subtitle, body, bullets, link) + footnotes |
| `audiences` | audience cards (icon image, title, body) |
| `testimonial` | heading, body, quote, author, background image |
| `resources` | article/journal cards (`ResourceCard`) + optional "view all" link |
| `text` | optional heading + paragraphs |
| `cta` | heading, body, `ctas`, rich-text `note`, background image |
| `people` | team/advisor grid; a person with `bio` gets a "Read Bio" modal |

**4. Field types.**
- Plain strings for headings, body, labels. Store what the reader sees: `&`, not
  `&amp;`; `'`, not `&#39;`. Render with `{value}` (Astro escapes it).
- `RichTextSchema` only where the source has inline formatting inside a run of
  copy. Allowed tags: `<strong>`, `<em>`, `<a>`, `<br>`; only `<a>` takes attributes
  (`href`, `target`, `rel`, `class`). Store the HTML fragment exactly as it should be
  emitted and render it with `<Fragment set:html={value} />`. The schema rejects any
  other tag or attribute, `javascript:` links, unbalanced tags and stray `<`.
- If the inline markup is a design accent (a styled `<em class="...">` inside a
  heading), don't use rich text: split it into fields and keep the tag in the
  template (footer CTA: `heading` + `highlight`).
- Images: `{ src, alt }`. `src` is root-absolute under `public/` (`/images/x.jpg`).
  Decorative/background images use `alt: ""`. When a component only takes a URL
  (`CtaBand image`, `ResourceCard thumbnail`, `TeamCard headshot`), pass `.src`.
- Links: `{ label, href }`. `href` is `/path`, `#anchor`, `http(s)://`, `mailto:` or `tel:`.
- CTAs: arrays of `{ label, href }` (navigates) or `{ label, modal: 'demo' | 'contact' }`
  (opens a site modal via `data-open-modal`). Never both.
- Things that stay in templates: SVG icons, classes, layout, `aria-label`s on icon-only
  controls, decorative glyphs (the `•` bullet), client-script strings.

**5. Repeated items.**
- *Open lists* (uniform items an editor may add or remove: paragraphs, bullets,
  resource cards, people, logos, footer links): render with `.map()`. If the
  source had literal siblings, keep the single space Astro emitted between them:
  ```astro
  {items.map((p, i) => <Fragment>{i > 0 && ' '}<p>{p}</p></Fragment>)}
  ```
  (Leave a pre-existing `.map()` alone: it never had separators.)
- *Fixed-slot lists* (each item has its own hand-built markup: a distinct SVG icon,
  a one-off class, a badge on one item): keep the literal markup, destructure with
  `slots()` so the count is enforced at build time, and bind each slot:
  `const [ocula, nsight, secondOpinion, ophthal] = slots(products.cards, 4, 'home/products.cards');`
  The admin must not offer add/remove on these arrays.

**6. Component-slot whitespace.** Literal text on its own line inside a
*component* (`<PipeHeading>\n  Text\n</PipeHeading>`) rendered with surrounding
spaces; an expression in the same spot is trimmed. Keep the spaces explicitly:
`{' '}{hero.heading}{' '}`. Inline text (`<PipeHeading>Text</PipeHeading>`) needs
nothing. Plain HTML elements are not affected.

**7. Client scripts.** Data used by an `is:inline` script is passed with
`define:vars={{ name: value }}` (safe JSON serialization), never string-built into
the script. Escape content before inserting it into `innerHTML` (see the partners
marquee in `pages/index.astro`).

**8. Registering a page.** Add `pages/<slug>.json`, register it in
`CONTENT_FILES.pages` (`schema.ts`) and in `PAGE_JSON` (`index.ts`).

**9. Tailwind.** Tailwind scans the JSON (rich text may carry classes) but not
`src/content/*.ts`, this README or `scripts/` (see `@source not` in
`src/styles/global.css`). If you add another code/docs file here, exclude it too,
or words in it can add CSS rules.

## Verification (mandatory for every extraction PR)

The rendered site must not change. `astro build` output before and after must match.

```bash
# 1. baseline, BEFORE editing anything
npx astro build; echo RC=$?
rm -rf /tmp/dist-baseline && cp -r dist /tmp/dist-baseline

# 2. extract, then rebuild
npx astro build; echo RC=$?

# 3. compare
node scripts/dist-parity.mjs /tmp/dist-baseline dist; echo RC=$?
diff -r /tmp/dist-baseline dist | wc -c     # raw size, for the record
```

`dist-parity.mjs` requires every non-HTML file (CSS, JS, images) to be
byte-identical, and every HTML file to be identical after normalizing only the three
spellings an extraction changes without changing what the browser renders:
entity spelling (`'` vs `&#39;`, `&` vs `&amp;`), whitespace-run spelling (`"\n"` vs
`" "`), and empty attributes (`alt=""` vs `alt`). It never removes whitespace, so a
lost space between elements is still caught. Target: `RC=0` with 0 `DIFFERENT`
files. Anything `DIFFERENT` is either a template mistake (fix the template) or a
deliberate change, which must be justified in the PR, with proof it renders the same.

If a hashed CSS file changes, a new file introduced class-like words that Tailwind
picked up (rule 9).
