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

Extracted: every marketing page and the footer (`globals.json`):

| slug | route |
| --- | --- |
| `home` | / |
| `about` | /about |
| `who-we-help` | /who-we-help |
| `solutions` | /solutions |
| `ocula360`, `nsight360`, `second-opinion`, `ophthal360` | /solutions/ocula360, /nsight360, /2nd-opinion, /ophthal360 |
| `resources` | /resources |
| `articles` | /resources/articles |
| `article-bridging-the-gap` | /resources/articles/bridging-the-gap-eye-care |
| `article-atlanta-startup` | /resources/articles/atlanta-startup-saving-billions |
| `newsroom` | /resources/newsroom |
| `innovation-pipeline` | /resources/innovation-pipeline |

**Locked (not editable in v1)**, listed with the reason in `LOCKED_PAGES` (`schema.ts`)
so the admin catalogue can show it: `privacy`, `terms` (legal documents), `trust`
(/trust and every /trust/* security document) and `styleguide` (internal). Their copy
stays in the templates.

## How a page reads content

```astro
---
import { getPage, required, section, slots } from '../content';

const page = getPage('about');                       // parses + validates the file
const story = section(page, 'story', 'text');        // typed; throws if missing or wrong type
const joinUs = section(page, 'join-us', 'cta');
const hero = section(page, 'hero', 'hero');
const [joinCta] = slots(joinUs.ctas, 1, 'about/join-us.ctas'); // fixed-slot list
const heroImage = required(hero.image, 'about/hero.image');    // optional in the block type, needed here
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
| `features` | grid of cards: capabilities, steps, use cases, benefits, product tiles, related links, category pills. Items: `title` + optional `eyebrow`, `body`, `tag`, `image`, `bullets`, `href` (whole card links). Section: `eyebrow`, `heading`, `intro`, `linkLabel` (the per-card "Learn more"), `closing`, background `image` |
| `stats` | statement band: eyebrow, heading, `stats` (value + label), background image |
| `fit` | product fit (who-we-help): product name, audience tagline, heading, body, "who it's for" photo pills (`photoPosition`/`photoZoom` crop tuning), "how it helps" bullets, closing line |
| `divider` | labelled horizontal rule between sections |
| `figure` | a standalone image with optional caption |
| `article` | long-form article: byline (`author`, `authorRole`, `date`), `cover`, `lead`, ordered `body` nodes, `source` note + link |

Optional fields added to existing types by the follow-up extraction:
- `hero`: `headingLine2` (second heading line after a `<br>`), `subheading` (line under
  the heading), `breadcrumb` (current-page crumb; the parent crumbs are site navigation
  and stay in the template), `media` (foreground image beside the copy; `image` stays
  the washed-out background).
- `split`: `badge` (pill), `subheading`, `closing` (emphasized last line), `bullets`,
  `points` (term + body), `stats`, `aside` (side card), `background` (band photo),
  `caption` (under `image`), `link`. A layout renders only the extras it has.
- `resources`: `heading` is optional (listing pages have none); cards take a display `date`.

Numbered steps (`01`, `02`, ...) are derived from the item position, not stored.

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
  (opens a site modal via `data-open-modal`). Never both. A template that renders a CTA
  slot only as a modal button (`data-open-modal={cta.modal}`) or only as a link
  (`href={cta.href}`) must pin that slot's shape in `SECTION_OVERRIDES` (rule 5b), or an
  editor could switch it to the other action and publish a dead button.
- Things that stay in templates: SVG icons, classes, layout, `aria-label`s on icon-only
  controls, decorative glyphs (the `•` bullet, the `→` after a card title), client-script
  strings, breadcrumb parent links, anchor ids (`id="who-its-for"`), and `target="_blank"`.
- Stat labels (`StatSchema.label`) are rich text so a label can break lines with `<br>`
  (`"U.S. clinic<br>partnerships"`); render with `set:html`.
- A section without `image` on a `CtaBand` gets the band's default photo.

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
- A list whose items have **different markup** is a fixed-slot list too, even when the
  difference is only whitespace or one class (`<p>Short.</p>` next to a multi-line
  `<p>`, `mt-6` on the first paragraph and `mt-4` on the second): whitespace inside an
  element is part of the output and the parity check catches it.
- **Every `slots(list, n, ...)` needs a matching `.length(n)`** in `SECTION_OVERRIDES`
  (`schema.ts`), keyed by page slug and section id:
  `ocula360: { hero: HeroBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }) }`.
  The page schema enforces it, and the admin reads it through
  `sectionSchema(slug, id, type)` to decide whether a list can grow or shrink. Nested
  lists extend the nested schema (`ShowcaseFlagshipSchema.extend(...)`); global lists
  put `.length(n)` directly on their schema (footer columns).
- Built-in icons for fixed slots live in the template as an array indexed by slot
  (`capabilityIcons[i]`). In an open list, an item without `image` gets the layout's
  built-in icon (nsight360 "who it's for").

**5b. The page contract (`SECTION_OVERRIDES`).** The block types are shared by many
pages, so their fields are mostly optional. What one page's template actually needs is
pinned per page and section in `SECTION_OVERRIDES` (`schema.ts`), and the admin builds its
forms from it (`sectionSchema(slug, id, type)`): a pinned field has no "Remove" button, a
fixed list no add/remove, a typed CTA slot no link/popup switch. Keep it in step with the
templates; every one of these needs an entry:
- `slots(list, n, ...)` -> `.length(n)` (`fixed(ItemSchema, n)`).
- `required(section.field, ...)` -> the field without `.optional()`:
  `about: { hero: HeroBlockSchema.extend({ image: ImageSchema }) }`. Inside a list
  (`required(c.body, 'nsight360/capabilities.items.body')`), extend the item schema.
- An optional `href` rendered unconditionally (`<a href={item.href}>`) -> required
  (`LinkedItemSchema`).
- A CTA slot used only as `data-open-modal={cta.modal}` -> `ModalCtaSchema`; only as
  `href={cta.href}` -> `LinkCtaSchema`; the slots as a `z.tuple([...])` in order (a tuple
  also fixes the count): `hero: HeroBlockSchema.extend({ ctas: z.tuple([ModalCtaSchema, LinkCtaSchema]) })`.
  The footer's `cta.button` is `ModalCtaSchema` in `FooterSchema` itself.
Section ids themselves are fixed: the admin never adds, removes or reorders sections, and
`section(page, id, type)` throws if one is missing.

**6. Component-slot whitespace.** Literal text on its own line inside a
*component* (`<PipeHeading>\n  Text\n</PipeHeading>`) rendered with surrounding
spaces; an expression in the same spot is trimmed. Keep the spaces explicitly:
`{' '}{hero.heading}{' '}`. Inline text (`<PipeHeading>Text</PipeHeading>`) needs
nothing. Plain HTML elements are not affected.

**6b. Article bodies and scoped styles.** A page with a scoped `<style>` gives every
element in its template a `data-astro-cid-*` attribute, which `set:html` cannot add.
So `article` body text is `FlatRichTextSchema` (the rich-text tags, never nested) and
the template renders it run by run with `richRuns(text)` from the loader (`<strong>`,
`<em>`, `<a>`, `<br>` each written in the template). Body nodes, in order:
`heading` (`level` 2 or 3), `paragraph`, `list` (optional one-line `intro` set directly
above it, e.g. "Among these:"), `quote`, `rule` (`<hr>`), `image` (+ `caption`).

**7. Client scripts.** Data used by an `is:inline` script is passed with
`define:vars={{ name: value }}` (safe JSON serialization), never string-built into
the script. Escape content before inserting it into `innerHTML` (see the partners
marquee in `pages/index.astro`).

**8. Registering a page.** Add `pages/<slug>.json`, register it in
`CONTENT_FILES.pages` (`schema.ts`) and in `PAGE_JSON` (`index.ts`), and add its
page contract (fixed-slot lists, `required()` fields, typed CTA slots) to
`SECTION_OVERRIDES` (rule 5b).

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
