/**
 * Ophthalytics site content schema.
 *
 * SHARED FILE: the marketing site (Astro) validates its content with it at build
 * time, and the admin portal (Next.js) vendors this file VERBATIM to validate edits
 * before opening a PR. It must therefore depend on `zod` only: no Astro, Node or
 * browser imports. Written against the API subset that zod 3 and zod 4 share.
 *
 * Field rules (see src/content/README.md for the full extraction guide):
 * - Headings, body copy, labels: plain strings, stored as the reader sees them
 *   (a literal "&", never "&amp;"). Templates render them with `{value}`, which
 *   escapes them.
 * - RichText: only where the source markup has inline formatting inside a run of
 *   copy. Allowed tags: <strong>, <em>, <a>, <br>. <a> may carry href, target, rel
 *   and class; no other tag may carry attributes. Rendered with `set:html`.
 * - Images: { src, alt } with a root-absolute `src` under public/ ("/images/x.jpg").
 *   Decorative/background images use alt: "".
 * - Links: { label, href }. CTAs: arrays of { label, href } or { label, modal }.
 * - Every section has a stable kebab-case `id` (never renamed once shipped, the
 *   templates look sections up by it) and a human `label` for the admin UI.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ primitives */

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Stable, kebab-case section id: `hero`, `final-cta`, `who-we-help`. */
export const SectionIdSchema = z
  .string()
  .regex(KEBAB, 'section id must be kebab-case (a-z, 0-9, single hyphens)');

/** A required, non-empty line of copy. */
const Text = z.string().min(1, 'must not be empty');

/**
 * Backslashes and control characters are never valid in a stored path or URL: browsers
 * read "/\host" as "//host" (another origin) and strip tabs/newlines inside URLs.
 */
const URL_SAFE_CHARS = /^[^\\\u0000-\u001f\u007f]*$/;
const URL_SAFE_MESSAGE = 'must not contain backslashes or control characters';

/** Root-absolute path to a file under public/ ("/images/x.jpg"; not "//cdn..."). */
export const MediaPathSchema = z
  .string()
  .regex(/^\/(?!\/)\S*$/, 'must be a root-absolute path under public/, e.g. /images/photo.jpg')
  .regex(URL_SAFE_CHARS, URL_SAFE_MESSAGE);

/** Internal path, in-page anchor, or an absolute http(s)/mailto/tel URL. */
export const HrefSchema = z
  .string()
  .regex(
    /^(?:\/(?!\/)\S*|#\S*|https?:\/\/\S+|mailto:\S+|tel:\S+)$/,
    'must be a root-relative path (/about), #anchor, http(s):// URL, mailto: or tel:',
  )
  .regex(URL_SAFE_CHARS, URL_SAFE_MESSAGE);

/** Site modals a CTA can open (they are rendered once in the Layout). */
export const ModalNameSchema = z.enum(['demo', 'contact']);

export const ImageSchema = z
  .object({
    src: MediaPathSchema,
    /** Empty string for decorative/background images. */
    alt: z.string(),
  })
  .strict();

export const LinkSchema = z.object({ label: Text, href: HrefSchema }).strict();

/** A call to action: either navigates (`href`) or opens a site modal (`modal`). */
export const CtaSchema = z
  .object({
    label: Text,
    href: HrefSchema.optional(),
    modal: ModalNameSchema.optional(),
  })
  .strict()
  .refine((c) => (c.href === undefined) !== (c.modal === undefined), {
    message: 'a CTA needs exactly one of `href` or `modal`',
  });

/* ------------------------------------------------------------------- rich text */

export const RICH_TEXT_TAGS = ['strong', 'em', 'a', 'br'] as const;
export const RICH_TEXT_LINK_ATTRS = ['href', 'target', 'rel', 'class'] as const;

/** `<strong>`, `<em>` (open), `</strong>`, `</em>`, `</a>` (close), `<br>`, `<br/>`, `<br />`. */
const RT_SIMPLE = /^<(\/?)(strong|em|a|br)( ?\/)?>/;
/** `<a` + one or more ` name="value"` + optional spaces + `>`; values hold no `<`, `>` or `"`. */
const RT_LINK = /^<a((?: +[a-z]+="[^"<>]*")+) *>/;
const RT_LINK_ATTR = / +([a-z]+)="([^"<>]*)"/;

/**
 * Problems with a link's href as written in the markup (empty = valid). The only
 * character reference allowed in an href is `&amp;`, so what the browser follows is
 * exactly the decoded value that HrefSchema checks.
 */
function richTextHrefProblems(raw: string): string[] {
  if (/&(?!amp;)/.test(raw)) return [`<a href="${raw}">: the only entity allowed in an href is &amp;`];
  const href = raw.replace(/&amp;/g, '&');
  return HrefSchema.safeParse(href).success ? [] : [`<a href="${raw}"> is not a valid href`];
}

/**
 * Returns a list of problems with a rich-text string (empty = valid). A strict
 * tokenizer, not a sanitizer: every "<" must start one complete, well-formed allowed
 * tag, written exactly as `<strong>`, `</strong>`, `<em>`, `</em>`, `<br>`, `<br/>`,
 * `<br />`, `</a>`, or `<a` + attributes from RICH_TEXT_LINK_ATTRS (each once,
 * double-quoted, no `<` `>` `"` inside, an `href` that passes HrefSchema) + `>`.
 * Tags must nest and balance, links may not nest, and no other "<" may appear (write
 * it as &lt;). This is the build-time backstop so disallowed markup can never reach
 * `set:html`; the admin also sanitizes on save and re-checks on submit.
 */
export function richTextProblems(value: string): string[] {
  const problems: string[] = [];
  const stack: string[] = [];
  let at = 0;
  while (problems.length < 20) {
    const lt = value.indexOf('<', at);
    if (lt === -1) break;
    const rest = value.slice(lt, lt + 2048);
    const simple = RT_SIMPLE.exec(rest);
    if (simple) {
      const [whole, closing, name, selfClose] = simple;
      at = lt + whole.length;
      if (name === 'br') {
        if (closing) problems.push('</br> is not valid; write <br>');
        continue;
      }
      if (selfClose) {
        problems.push(`<${closing}${name}${selfClose}> is not valid`);
        continue;
      }
      if (closing) {
        const top = stack.pop();
        if (top !== name) {
          problems.push(`unbalanced </${name}>`);
          if (top !== undefined) stack.push(top);
        }
        continue;
      }
      if (name === 'a') {
        problems.push('<a> needs an href');
        stack.push('a');
        continue;
      }
      stack.push(name);
      continue;
    }
    const link = RT_LINK.exec(rest);
    if (link) {
      at = lt + link[0].length;
      const seen = new Set<string>();
      const attrRe = new RegExp(RT_LINK_ATTR.source, 'g');
      let a: RegExpExecArray | null;
      while ((a = attrRe.exec(link[1]))) {
        const [, attr, raw] = a;
        if (!(RICH_TEXT_LINK_ATTRS as readonly string[]).includes(attr)) {
          problems.push(`<a ${attr}> is not allowed (allowed: ${RICH_TEXT_LINK_ATTRS.join(', ')})`);
        }
        if (seen.has(attr)) problems.push(`<a> repeats the ${attr} attribute`);
        seen.add(attr);
        if (attr === 'href') problems.push(...richTextHrefProblems(raw));
      }
      if (!seen.has('href')) problems.push('<a> needs an href');
      if (stack.includes('a')) problems.push('a link cannot contain another link');
      stack.push('a');
      continue;
    }
    const shown = value.slice(lt, lt + 24).replace(/\s+/g, ' ');
    problems.push(
      `"${shown}${value.length > lt + 24 ? '…' : ''}" is not an allowed tag (allowed exactly: ` +
        `<strong>, <em>, <br>, <a href="…">); write a literal "<" as &lt;`,
    );
    at = lt + 1;
  }
  if (stack.length) problems.push(`unclosed <${stack.join('>, <')}>`);
  return problems;
}

/** Inline-formatted copy (see RICH_TEXT_TAGS). Stored as the exact HTML fragment. */
export const RichTextSchema = z.string().superRefine((value, ctx) => {
  for (const message of richTextProblems(value)) ctx.addIssue({ code: 'custom', message });
});

/** One run of flat rich text: plain text, or one formatted element holding plain text. */
export type RichTextRun =
  | { tag: 'text'; text: string }
  | { tag: 'strong' | 'em'; text: string }
  | { tag: 'br' }
  | { tag: 'a'; text: string; href: string; target?: string; rel?: string; class?: string };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const decodeEntities = (text: string) =>
  text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });

/**
 * Splits valid, FLAT rich text (no tag inside another tag) into runs, with entities
 * decoded, so a template can render each run as its own element. Used where the page
 * has scoped styles (`data-astro-cid-*` attributes must be on every element, which
 * `set:html` cannot add). Returns null when the value nests tags.
 */
export function richTextRuns(value: string): RichTextRun[] | null {
  const runs: RichTextRun[] = [];
  const tagRe = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
  let open: { name: string; attrs: string; start: number } | null = null;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(value))) {
    const [whole, closing, rawName, rawAttrs] = m;
    const name = rawName.toLowerCase();
    if (!open) {
      if (m.index > last) runs.push({ tag: 'text', text: decodeEntities(value.slice(last, m.index)) });
      if (closing) return null;
      if (name === 'br') runs.push({ tag: 'br' });
      else open = { name, attrs: rawAttrs, start: m.index + whole.length };
    } else {
      if (!closing || name !== open.name) return null;
      const text = decodeEntities(value.slice(open.start, m.index));
      if (open.name === 'a') {
        const attrs: Record<string, string> = {};
        const attrRe = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
        let a: RegExpExecArray | null;
        while ((a = attrRe.exec(open.attrs))) attrs[a[1].toLowerCase()] = decodeEntities(a[2]);
        runs.push({ tag: 'a', text, href: attrs.href ?? '', target: attrs.target, rel: attrs.rel, class: attrs.class });
      } else if (open.name === 'strong' || open.name === 'em') {
        runs.push({ tag: open.name, text });
      } else {
        return null;
      }
      open = null;
    }
    last = m.index + whole.length;
  }
  if (open) return null;
  if (last < value.length) runs.push({ tag: 'text', text: decodeEntities(value.slice(last)) });
  return runs;
}

/** Rich text whose tags do not nest (`<strong>a</strong> b <a href="/x">c</a>`). */
export const FlatRichTextSchema = RichTextSchema.superRefine((value, ctx) => {
  if (richTextProblems(value).length === 0 && richTextRuns(value) === null) {
    ctx.addIssue({ code: 'custom', message: 'formatting cannot be nested here (no tag inside another tag)' });
  }
});

/* ---------------------------------------------------------------- block types */

export const BLOCK_TYPES = [
  'hero',
  'partners',
  'split',
  'showcase',
  'products',
  'audiences',
  'testimonial',
  'resources',
  'text',
  'cta',
  'people',
  'features',
  'stats',
  'fit',
  'divider',
  'figure',
  'article',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** Every section: discriminant `type`, stable `id`, admin-facing `label`. */
const block = <T extends BlockType, S extends z.ZodRawShape>(type: T, shape: S) =>
  z
    .object({
      type: z.literal(type),
      id: SectionIdSchema,
      label: Text,
      ...shape,
    })
    .strict();

/** Post-event / upcoming-event promo strip at the bottom of a hero. */
export const EventPromoSchema = z
  .object({
    eyebrow: Text,
    title: Text,
    /** Optional; rendered as " · <date>" after the title when non-empty. */
    date: z.string(),
    presentedByPrefix: Text,
    presenter: Text,
    photo: ImageSchema,
    /** Empty string renders the button as a disabled "coming soon" pill. */
    url: z.union([z.literal(''), HrefSchema]),
    linkLabel: Text,
    comingSoonTitle: Text,
  })
  .strict();

/** Page hero: optional eyebrow, heading, optional body, background image, CTAs. */
export const HeroBlockSchema = block('hero', {
  eyebrow: Text.optional(),
  heading: Text,
  /** Second line of the heading, rendered after a line break. */
  headingLine2: Text.optional(),
  /** Line under the heading (product name heroes: "Foundational Retinal AI"). */
  subheading: Text.optional(),
  /** Current-page crumb of the breadcrumb trail (the parent links are site navigation). */
  breadcrumb: Text.optional(),
  body: Text.optional(),
  /** Background image (washed out behind the copy). */
  image: ImageSchema.optional(),
  /** Foreground image beside the copy (product shot, illustration). */
  media: ImageSchema.optional(),
  ctas: z.array(CtaSchema).optional(),
  promo: EventPromoSchema.optional(),
});

/** Built-in fallback marks for partners without a logo file (drawn in code). */
export const PartnerIconSchema = z.enum(['pulse', 'hospital', 'cross', 'clinic']);

export const PartnerSchema = z
  .object({
    name: Text,
    tag: Text,
    /** Logo file. When absent, `icon` draws a built-in mark instead. */
    logo: ImageSchema.optional(),
    /** Logo height multiplier (1 = 80px). */
    scale: z.number().positive().max(3).optional(),
    icon: PartnerIconSchema.optional(),
  })
  .strict()
  .refine((p) => (p.logo === undefined) !== (p.icon === undefined), {
    message: 'a partner needs exactly one of `logo` or `icon`',
  });

/** Scrolling "trusted by" logo marquee. */
export const PartnersBlockSchema = block('partners', {
  eyebrow: Text,
  logos: z.array(PartnerSchema).min(1),
});

/** A figure: `value` ("95%", "250K+", "<2s") and its label. `label` may break lines with <br>. */
export const StatSchema = z.object({ value: Text, label: RichTextSchema }).strict();

/** Term + explanation pair ("Trustworthiness: Every output is explainable..."). */
export const PointSchema = z.object({ term: Text, body: Text }).strict();

/** Side card next to the copy (a highlighted statement). */
export const AsideSchema = z
  .object({ eyebrow: Text.optional(), heading: Text, body: Text })
  .strict();

/**
 * Copy panel over/next to an image (or a side card / stats panel): heading +
 * paragraphs, plus optional extras. Which extras a section shows is fixed by its
 * page layout; an extra the layout does not render is ignored.
 */
export const SplitBlockSchema = block('split', {
  eyebrow: Text.optional(),
  /** Small pill label ("Flagship", "Journal Article"). */
  badge: Text.optional(),
  heading: Text,
  subheading: Text.optional(),
  paragraphs: z.array(Text).min(1),
  /** Emphasized line after the paragraphs. */
  closing: Text.optional(),
  bullets: z.array(Text).optional(),
  points: z.array(PointSchema).optional(),
  stats: z.array(StatSchema).optional(),
  aside: AsideSchema.optional(),
  image: ImageSchema.optional(),
  /** Section background photo, for band layouts. */
  background: ImageSchema.optional(),
  /** Caption under the image. */
  caption: Text.optional(),
  link: LinkSchema.optional(),
});

export const TileSchema = z.object({ title: Text, body: Text }).strict();

export const ShowcaseFlagshipSchema = z
  .object({
    eyebrow: Text,
    heading: Text,
    subheading: Text,
    paragraphs: z.array(Text).min(1),
    link: LinkSchema,
  })
  .strict();

/** Flagship product showcase: header row, flagship card, highlight card, tiles. */
export const ShowcaseBlockSchema = block('showcase', {
  eyebrow: Text,
  tagline: Text,
  pill: Text,
  flagship: ShowcaseFlagshipSchema,
  highlight: z.object({ eyebrow: Text, heading: Text, body: Text }).strict(),
  tiles: z.array(TileSchema).min(1),
});

export const ProductCardSchema = z
  .object({
    title: Text,
    subtitle: Text,
    body: Text,
    bullets: z.array(Text).min(1),
    image: ImageSchema,
    badge: Text.optional(),
    link: LinkSchema,
  })
  .strict();

/** Product grid with imagery, bullets and a link per product. */
export const ProductsBlockSchema = block('products', {
  heading: Text,
  intro: Text.optional(),
  cards: z.array(ProductCardSchema).min(1),
  /** Small print under the grid. */
  footnotes: z.array(Text).optional(),
});

export const AudienceCardSchema = z
  .object({ title: Text, body: Text, image: ImageSchema })
  .strict();

/** Audience cards (icon image + title + body). */
export const AudiencesBlockSchema = block('audiences', {
  heading: Text,
  intro: Text.optional(),
  cards: z.array(AudienceCardSchema).min(1),
});

/** Quote band: heading, body, pull quote with attribution, background image. */
export const TestimonialBlockSchema = block('testimonial', {
  heading: Text,
  body: Text.optional(),
  quote: Text,
  author: Text,
  image: ImageSchema,
});

export const ResourceCategoryColorSchema = z.enum(['primary', 'accent', 'secondary', 'warn']);

export const ResourceCardSchema = z
  .object({
    category: Text,
    categoryColor: ResourceCategoryColorSchema,
    title: Text,
    excerpt: Text,
    /** "#" or "" renders a non-clickable card. */
    href: z.union([z.literal(''), z.literal('#'), HrefSchema]),
    thumbnail: ImageSchema.optional(),
    /** Publication date as displayed ("March 18, 2025"); shown on listing pages. */
    date: Text.optional(),
  })
  .strict();

/** Grid of article/journal/news cards with an optional "view all" link. */
export const ResourcesBlockSchema = block('resources', {
  heading: Text.optional(),
  intro: Text.optional(),
  cards: z.array(ResourceCardSchema).min(1),
  link: LinkSchema.optional(),
});

/** Plain copy block: optional heading + paragraphs. */
export const TextBlockSchema = block('text', {
  eyebrow: Text.optional(),
  heading: Text.optional(),
  paragraphs: z.array(Text).min(1),
});

/** Call-to-action band. `note` is the small print under the buttons. */
export const CtaBlockSchema = block('cta', {
  heading: Text,
  body: Text.optional(),
  ctas: z.array(CtaSchema).min(1),
  note: RichTextSchema.optional(),
  image: ImageSchema.optional(),
});

export const PersonSchema = z
  .object({
    name: Text,
    role: Text,
    headshot: ImageSchema.optional(),
    /** Long bio shown in a modal ("Read Bio"). */
    bio: z
      .object({
        /** Modal name; kebab-case, unique on the page. */
        modal: SectionIdSchema,
        tagline: Text.optional(),
        paragraphs: z.array(Text).min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Team / advisory-board grid. */
export const PeopleBlockSchema = block('people', {
  heading: Text,
  people: z.array(PersonSchema).min(1),
});

/**
 * One card in a `features` grid. Only `title` is always shown; the page layout
 * decides which of the other fields a card renders.
 */
export const FeatureItemSchema = z
  .object({
    /** Small label above the title. */
    eyebrow: Text.optional(),
    title: Text,
    body: Text.optional(),
    /** Small print under the body. */
    tag: Text.optional(),
    /** Icon or photo. Where a layout draws built-in icons, a card without one gets the built-in. */
    image: ImageSchema.optional(),
    bullets: z.array(Text).optional(),
    /** Makes the whole card a link. */
    href: HrefSchema.optional(),
  })
  .strict();

/**
 * Grid of cards: capabilities, steps (numbered by position), use cases, benefits,
 * product tiles, related links. `image` is the section background, when the layout has one.
 */
export const FeaturesBlockSchema = block('features', {
  eyebrow: Text.optional(),
  heading: Text,
  intro: Text.optional(),
  items: z.array(FeatureItemSchema).min(1),
  /** Label of the link shown on each card ("Learn more"). */
  linkLabel: Text.optional(),
  /** Line after the grid. */
  closing: Text.optional(),
  image: ImageSchema.optional(),
});

/** Statement band with key figures over a background photo. */
export const StatsBlockSchema = block('stats', {
  eyebrow: Text.optional(),
  heading: Text,
  stats: z.array(StatSchema).min(1),
  image: ImageSchema.optional(),
});

/** A "who it's for" pill: label + round photo, with optional crop tuning. */
export const FitAudienceSchema = z
  .object({
    label: Text,
    photo: ImageSchema,
    /** CSS object-position of the photo inside its circle ("40% center"). */
    photoPosition: z
      .string()
      .regex(/^[a-z0-9%. -]+$/, 'use CSS object-position keywords/percentages, e.g. "40% center"')
      .optional(),
    /** Zoom of the photo inside its circle (1 = none). */
    photoZoom: z.number().min(1).max(3).optional(),
  })
  .strict();

/** Product fit: who a product is for (photo pills) and how it helps (bullets). */
export const FitBlockSchema = block('fit', {
  /** Product name. */
  eyebrow: Text,
  /** Audience line next to the product name. */
  tagline: Text,
  heading: Text,
  body: Text,
  audiencesHeading: Text,
  audiences: z.array(FitAudienceSchema).min(1),
  benefitsHeading: Text,
  benefits: z.array(Text).min(1),
  closing: Text,
});

/** Labelled horizontal rule between sections. */
export const DividerBlockSchema = block('divider', {
  heading: Text,
});

/** A standalone image with an optional caption. */
export const FigureBlockSchema = block('figure', {
  image: ImageSchema,
  caption: Text.optional(),
});

/* Article body nodes, rendered in order. Inline formatting is flat rich text. */
export const ArticleHeadingSchema = z
  .object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), text: Text })
  .strict();
export const ArticleParagraphSchema = z
  .object({ type: z.literal('paragraph'), text: FlatRichTextSchema })
  .strict();
export const ArticleListSchema = z
  .object({
    type: z.literal('list'),
    /** Short lead-in line set directly above the list ("Among these:"). */
    intro: Text.optional(),
    items: z.array(FlatRichTextSchema).min(1),
  })
  .strict();
export const ArticleQuoteSchema = z.object({ type: z.literal('quote'), text: Text }).strict();
/** Horizontal rule. */
export const ArticleRuleSchema = z.object({ type: z.literal('rule') }).strict();
export const ArticleImageSchema = z
  .object({ type: z.literal('image'), image: ImageSchema, caption: Text.optional() })
  .strict();
export const ArticleNodeSchema = z.discriminatedUnion('type', [
  ArticleHeadingSchema,
  ArticleParagraphSchema,
  ArticleListSchema,
  ArticleQuoteSchema,
  ArticleRuleSchema,
  ArticleImageSchema,
]);
export type ArticleNode = z.infer<typeof ArticleNodeSchema>;

/** Long-form article: byline, cover, lead paragraph, ordered body, link to the original. */
export const ArticleBlockSchema = block('article', {
  author: Text,
  authorRole: Text,
  /** As displayed ("March 18, 2025"). */
  date: Text,
  cover: ImageSchema,
  lead: Text,
  body: z.array(ArticleNodeSchema).min(1),
  /** "Originally published ..." note at the end; `link` is the original. */
  source: z.object({ text: Text, link: LinkSchema }).strict(),
});

export const SectionSchema = z.discriminatedUnion('type', [
  HeroBlockSchema,
  PartnersBlockSchema,
  SplitBlockSchema,
  ShowcaseBlockSchema,
  ProductsBlockSchema,
  AudiencesBlockSchema,
  TestimonialBlockSchema,
  ResourcesBlockSchema,
  TextBlockSchema,
  CtaBlockSchema,
  PeopleBlockSchema,
  FeaturesBlockSchema,
  StatsBlockSchema,
  FitBlockSchema,
  DividerBlockSchema,
  FigureBlockSchema,
  ArticleBlockSchema,
]);
export type Section = z.infer<typeof SectionSchema>;
/** The section type for a given `type` discriminant. */
export type SectionOf<T extends BlockType> = Extract<Section, { type: T }>;

/** The generic schema of every block type. */
export const BLOCK_SCHEMAS = {
  hero: HeroBlockSchema,
  partners: PartnersBlockSchema,
  split: SplitBlockSchema,
  showcase: ShowcaseBlockSchema,
  products: ProductsBlockSchema,
  audiences: AudiencesBlockSchema,
  testimonial: TestimonialBlockSchema,
  resources: ResourcesBlockSchema,
  text: TextBlockSchema,
  cta: CtaBlockSchema,
  people: PeopleBlockSchema,
  features: FeaturesBlockSchema,
  stats: StatsBlockSchema,
  fit: FitBlockSchema,
  divider: DividerBlockSchema,
  figure: FigureBlockSchema,
  article: ArticleBlockSchema,
} as const satisfies Record<BlockType, z.ZodTypeAny>;

/* ----------------------------------------------------------------------- pages */

/** One slug per route. Extracted pages have a file in CONTENT_FILES.pages. */
export const PAGE_SLUGS = [
  'home', // /
  'about', // /about
  'solutions', // /solutions
  'ocula360', // /solutions/ocula360
  'nsight360', // /solutions/nsight360
  'second-opinion', // /solutions/2nd-opinion
  'ophthal360', // /solutions/ophthal360
  'who-we-help', // /who-we-help
  'resources', // /resources
  'articles', // /resources/articles
  'article-bridging-the-gap', // /resources/articles/bridging-the-gap-eye-care
  'article-atlanta-startup', // /resources/articles/atlanta-startup-saving-billions
  'innovation-pipeline', // /resources/innovation-pipeline
  'newsroom', // /resources/newsroom
  'trust', // /trust (+ /trust/* documents)
  'privacy', // /privacy
  'terms', // /terms
  'styleguide', // /styleguide (internal)
] as const;
export const PageSlugSchema = z.enum(PAGE_SLUGS);
export type PageSlug = (typeof PAGE_SLUGS)[number];

/* ------------------------------------------------------ fixed-slot lists per page */

/** A list whose layout has exactly `n` hand-built slots: editors change items, never the count. */
const fixed = <T extends z.ZodTypeAny>(item: T, n: number) => z.array(item).length(n);

/**
 * Page-specific section schemas. A section listed here must match this schema in
 * addition to its block type's: it pins the lists whose layout has one hand-built
 * slot per item (bespoke icons, one-off classes) to their exact length with
 * `.length(n)`. The admin reads these to disable add/remove on such lists; the
 * templates guard the same counts with `slots()`. Look them up with `sectionSchema()`.
 */
export const SECTION_OVERRIDES: { readonly [P in PageSlug]?: Readonly<Record<string, z.ZodTypeAny>> } = {
  home: {
    hero: HeroBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
    flagship: ShowcaseBlockSchema.extend({
      flagship: ShowcaseFlagshipSchema.extend({ paragraphs: fixed(Text, 2) }),
      tiles: fixed(TileSchema, 3),
    }),
    products: ProductsBlockSchema.extend({ cards: fixed(ProductCardSchema, 4) }),
    'who-we-help': AudiencesBlockSchema.extend({ cards: fixed(AudienceCardSchema, 4) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  about: {
    'join-us': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  solutions: {
    'platform-stats': StatsBlockSchema.extend({ stats: fixed(StatSchema, 3) }),
    platform: FeaturesBlockSchema.extend({ items: fixed(FeatureItemSchema, 4) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  ocula360: {
    hero: HeroBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
    capabilities: FeaturesBlockSchema.extend({ items: fixed(FeatureItemSchema, 4) }),
    approach: SplitBlockSchema.extend({ paragraphs: fixed(Text, 2) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  nsight360: {
    hero: HeroBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  'second-opinion': {
    hero: HeroBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
    capabilities: FeaturesBlockSchema.extend({ items: fixed(FeatureItemSchema, 3) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  ophthal360: {
    hero: HeroBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
    capabilities: FeaturesBlockSchema.extend({ items: fixed(FeatureItemSchema, 3) }),
    'who-its-for': FeaturesBlockSchema.extend({ items: fixed(FeatureItemSchema, 4) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  'who-we-help': {
    continuum: FeaturesBlockSchema.extend({ items: fixed(FeatureItemSchema, 3) }),
    'national-impact': SplitBlockSchema.extend({ paragraphs: fixed(Text, 2) }),
    'international-impact': SplitBlockSchema.extend({ paragraphs: fixed(Text, 2) }),
    'final-cta': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 1) }),
  },
  'innovation-pipeline': {
    intro: TextBlockSchema.extend({ paragraphs: fixed(Text, 3) }),
    'stay-connected': CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
  },
  'article-bridging-the-gap': {
    cta: CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
  },
  'article-atlanta-startup': {
    cta: CtaBlockSchema.extend({ ctas: fixed(CtaSchema, 2) }),
  },
};

/** The schema of section `id` on page `slug`: its page override, else its block type's schema. */
export function sectionSchema(slug: PageSlug, id: string, type: BlockType): z.ZodTypeAny {
  return SECTION_OVERRIDES[slug]?.[id] ?? BLOCK_SCHEMAS[type];
}

export const PageSchema = z
  .object({
    slug: PageSlugSchema,
    /** <title> */
    title: Text,
    /** <meta name="description"> */
    description: Text,
    sections: z.array(SectionSchema),
  })
  .strict()
  .superRefine((page, ctx) => {
    const seen = new Set<string>();
    page.sections.forEach((s, i) => {
      if (seen.has(s.id)) {
        ctx.addIssue({ code: 'custom', path: ['sections', i, 'id'], message: `duplicate section id "${s.id}"` });
      }
      seen.add(s.id);
      const override = SECTION_OVERRIDES[page.slug]?.[s.id];
      if (!override) return;
      const result = override.safeParse(s);
      if (result.success) return;
      // Report only what the override adds; the block type's own issues are already reported.
      const key = (issue: { path: PropertyKey[]; message: string }) => `${issue.path.join('.')}|${issue.message}`;
      const generic = new Set((BLOCK_SCHEMAS[s.type].safeParse(s).error?.issues ?? []).map(key));
      for (const issue of result.error.issues) {
        if (generic.has(key(issue))) continue;
        ctx.addIssue({ code: 'custom', path: ['sections', i, ...issue.path], message: issue.message });
      }
    });
  });
export type Page = z.infer<typeof PageSchema>;

/* --------------------------------------------------------------------- globals */

export const FooterColumnSchema = z
  .object({ heading: Text, links: z.array(LinkSchema) })
  .strict();

export const FooterSchema = z
  .object({
    /** CTA band above the footer body (hidden on Trust Center pages). */
    cta: z
      .object({
        heading: Text,
        /** Accent-colored tail of the heading. */
        highlight: Text,
        button: CtaSchema,
      })
      .strict(),
    tagline: Text,
    newsletter: z
      .object({
        eyebrow: Text,
        placeholder: Text,
        buttonLabel: Text,
        success: Text,
      })
      .strict(),
    /** Link columns, in display order: Platform, Clinicians, Science, Company. */
    columns: fixed(FooterColumnSchema, 4),
    /** Label of the modal button appended to the last column. */
    contactLabel: Text,
    copyright: Text,
    legalLinks: z.array(LinkSchema),
  })
  .strict();

export const GlobalsSchema = z.object({ footer: FooterSchema }).strict();
export type Globals = z.infer<typeof GlobalsSchema>;

/* -------------------------------------------------------------------- manifest */

/**
 * Repo paths (from the repo root) of every content file that exists today. The
 * admin reads/writes exactly these paths; a page slug missing here is not yet
 * extracted and is not editable.
 */
export const CONTENT_FILES = {
  globals: 'src/content/globals.json',
  pages: {
    home: 'src/content/pages/home.json',
    about: 'src/content/pages/about.json',
    solutions: 'src/content/pages/solutions.json',
    ocula360: 'src/content/pages/ocula360.json',
    nsight360: 'src/content/pages/nsight360.json',
    'second-opinion': 'src/content/pages/second-opinion.json',
    ophthal360: 'src/content/pages/ophthal360.json',
    'who-we-help': 'src/content/pages/who-we-help.json',
    newsroom: 'src/content/pages/newsroom.json',
    articles: 'src/content/pages/articles.json',
    resources: 'src/content/pages/resources.json',
    'innovation-pipeline': 'src/content/pages/innovation-pipeline.json',
    'article-bridging-the-gap': 'src/content/pages/article-bridging-the-gap.json',
    'article-atlanta-startup': 'src/content/pages/article-atlanta-startup.json',
  } as Partial<Record<PageSlug, string>>,
} as const;

/**
 * Pages that are deliberately NOT editable in the admin (v1), with the reason the
 * catalogue shows. Their copy stays in the .astro templates and changes go through
 * a normal code review.
 */
export const LOCKED_PAGES: { readonly [P in PageSlug]?: string } = {
  privacy: 'Not editable: legal document',
  terms: 'Not editable: legal document',
  trust: 'Not editable: security & compliance documents (Trust Center)',
  styleguide: 'Not editable: internal design reference',
};
