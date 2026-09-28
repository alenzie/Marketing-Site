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

/** Root-absolute path to a file under public/ ("/images/x.jpg"; not "//cdn..."). */
export const MediaPathSchema = z
  .string()
  .regex(/^\/(?!\/)\S*$/, 'must be a root-absolute path under public/, e.g. /images/photo.jpg');

/** Internal path, in-page anchor, or an absolute http(s)/mailto/tel URL. */
export const HrefSchema = z
  .string()
  .regex(
    /^(?:\/(?!\/)\S*|#\S*|https?:\/\/\S+|mailto:\S+|tel:\S+)$/,
    'must be a root-relative path (/about), #anchor, http(s):// URL, mailto: or tel:',
  );

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

/**
 * Returns a list of problems with a rich-text string (empty = valid). A structural
 * allowlist check, not a sanitizer: the admin sanitizes on save; this is the
 * build-time backstop so disallowed markup can never reach `set:html`.
 */
export function richTextProblems(value: string): string[] {
  const problems: string[] = [];
  const tagRe = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
  const stack: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(value))) {
    const [, closing, rawName, rawAttrs] = m;
    const name = rawName.toLowerCase();
    if (!(RICH_TEXT_TAGS as readonly string[]).includes(name)) {
      problems.push(`<${name}> is not allowed (allowed: ${RICH_TEXT_TAGS.join(', ')})`);
      continue;
    }
    const attrs = rawAttrs.replace(/\/\s*$/, '').trim();
    if (closing) {
      if (attrs) problems.push(`closing </${name}> must not have attributes`);
      if (stack.pop() !== name) problems.push(`unbalanced </${name}>`);
      continue;
    }
    if (name === 'br') {
      if (attrs) problems.push('<br> must not have attributes');
      continue;
    }
    if (name !== 'a' && attrs) problems.push(`<${name}> must not have attributes`);
    if (name === 'a') {
      const attrRe = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
      const leftover = attrs.replace(attrRe, '').trim();
      if (leftover) problems.push(`<a> has unparseable attributes: ${leftover}`);
      let a: RegExpExecArray | null;
      let hasHref = false;
      while ((a = attrRe.exec(attrs))) {
        const attr = a[1].toLowerCase();
        if (!(RICH_TEXT_LINK_ATTRS as readonly string[]).includes(attr)) {
          problems.push(`<a ${attr}> is not allowed (allowed: ${RICH_TEXT_LINK_ATTRS.join(', ')})`);
        }
        if (attr === 'href') {
          hasHref = true;
          if (!HrefSchema.safeParse(a[2]).success) problems.push(`<a href="${a[2]}"> is not a valid href`);
        }
      }
      if (!hasHref) problems.push('<a> needs an href');
    }
    stack.push(name);
  }
  if (stack.length) problems.push(`unclosed <${stack.join('>, <')}>`);
  if (/<(?![a-zA-Z/])/.test(value.replace(tagRe, ''))) problems.push('stray "<"; write it as &lt;');
  return problems;
}

/** Inline-formatted copy (see RICH_TEXT_TAGS). Stored as the exact HTML fragment. */
export const RichTextSchema = z.string().superRefine((value, ctx) => {
  for (const message of richTextProblems(value)) ctx.addIssue({ code: 'custom', message });
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
  body: Text.optional(),
  image: ImageSchema.optional(),
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

/** Copy panel over/next to an image: heading + paragraphs. */
export const SplitBlockSchema = block('split', {
  eyebrow: Text.optional(),
  heading: Text,
  paragraphs: z.array(Text).min(1),
  image: ImageSchema.optional(),
});

export const TileSchema = z.object({ title: Text, body: Text }).strict();

/** Flagship product showcase: header row, flagship card, highlight card, tiles. */
export const ShowcaseBlockSchema = block('showcase', {
  eyebrow: Text,
  tagline: Text,
  pill: Text,
  flagship: z
    .object({
      eyebrow: Text,
      heading: Text,
      subheading: Text,
      paragraphs: z.array(Text).min(1),
      link: LinkSchema,
    })
    .strict(),
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
  })
  .strict();

/** Grid of article/journal/news cards with an optional "view all" link. */
export const ResourcesBlockSchema = block('resources', {
  heading: Text,
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
]);
export type Section = z.infer<typeof SectionSchema>;
/** The section type for a given `type` discriminant. */
export type SectionOf<T extends BlockType> = Extract<Section, { type: T }>;

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
] as const;
export const PageSlugSchema = z.enum(PAGE_SLUGS);
export type PageSlug = (typeof PAGE_SLUGS)[number];

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
    columns: z.array(FooterColumnSchema),
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
  } as Partial<Record<PageSlug, string>>,
} as const;
