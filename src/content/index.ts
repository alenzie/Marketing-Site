/**
 * Typed, validated access to the site's content JSON.
 *
 * Every read parses its file against src/content/schema.ts. Invalid content throws,
 * which fails `astro build` with the file path and every offending field. Parsing
 * is cached per file, so a page that reads the same file several times (or the
 * footer on every page) validates it once per build.
 */
import type { ZodType } from 'zod';
import {
  CONTENT_FILES,
  GlobalsSchema,
  PageSchema,
  type BlockType,
  type Globals,
  type Page,
  type PageSlug,
  type SectionOf,
} from './schema';

import globalsJson from './globals.json';
import homeJson from './pages/home.json';
import aboutJson from './pages/about.json';

/** Raw JSON per extracted page. Add an entry here AND in CONTENT_FILES.pages. */
const PAGE_JSON: Partial<Record<PageSlug, unknown>> = {
  home: homeJson,
  about: aboutJson,
};

export class ContentError extends Error {
  override name = 'ContentError';
}

const cache = new Map<string, unknown>();

function parse<T>(schema: ZodType<T>, data: unknown, file: string): T {
  const hit = cache.get(file);
  if (hit !== undefined) return hit as T;
  const result = schema.safeParse(data);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const where = issue.path.length ? issue.path.join('.') : '(root)';
      return `  - ${where}: ${issue.message}`;
    });
    throw new ContentError(`Invalid content in ${file}:\n${lines.join('\n')}`);
  }
  cache.set(file, result.data);
  return result.data;
}

/** The validated content of one page. Throws if the page is not extracted or invalid. */
export function getPage(slug: PageSlug): Page {
  const file = CONTENT_FILES.pages[slug];
  const data = PAGE_JSON[slug];
  if (!file || data === undefined) {
    throw new ContentError(`No content file registered for page "${slug}" (see src/content/index.ts).`);
  }
  const page = parse(PageSchema, data, file);
  if (page.slug !== slug) {
    throw new ContentError(`${file} declares slug "${page.slug}" but is registered as "${slug}".`);
  }
  return page;
}

/** The validated site-wide content (footer, ...). */
export function getGlobals(): Globals {
  return parse(GlobalsSchema, globalsJson, CONTENT_FILES.globals);
}

/**
 * The section with `id`, narrowed to block type `type`. Throws if it is missing or
 * has a different type, so a template can never silently render a wrong shape.
 */
export function section<T extends BlockType>(page: Page, id: string, type: T): SectionOf<T> {
  const found = page.sections.find((s) => s.id === id);
  if (!found) {
    throw new ContentError(`Page "${page.slug}" has no section "${id}" (expected type "${type}").`);
  }
  if (found.type !== type) {
    throw new ContentError(`Section "${page.slug}/${id}" is type "${found.type}", expected "${type}".`);
  }
  return found as SectionOf<T>;
}

type Tuple<T, N extends number, R extends T[] = []> = R['length'] extends N ? R : Tuple<T, N, [...R, T]>;

/**
 * Asserts a fixed-slot list has exactly `n` items and returns it as a tuple, for
 * templates whose markup has one hand-built slot per item (bespoke icons, one-off
 * classes). `where` names the field in the error: `slots(s.cards, 4, 'home/products.cards')`.
 */
export function slots<T, N extends number>(items: readonly T[] | undefined, n: N, where: string): Tuple<T, N> {
  if (!items || items.length !== n) {
    throw new ContentError(
      `${where} must have exactly ${n} item(s) (has ${items?.length ?? 0}); its layout has a fixed slot per item.`,
    );
  }
  return items as unknown as Tuple<T, N>;
}

/**
 * Asserts that a field the schema marks optional is present, for templates whose
 * markup needs it: `required(hero.image, 'home/hero.image')`.
 */
export function required<T>(value: T | undefined, where: string): T {
  if (value === undefined) {
    throw new ContentError(`${where} is required by this page's layout but is missing.`);
  }
  return value;
}
