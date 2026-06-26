export interface BlogPost {
  slug: string;
  title: string;
  titleEn?: string;
  excerpt: string;
  excerptEn?: string;
  publishedAt: string;
  author: string;
  language: string;
  coverImage: string | null;
  tags: string[];
  body: string;
  filename: string;
}

export type BlogLang = "et" | "en" | "ru" | "lv" | "lt";

/** Per-language localized text bag. */
export type LocalizedText = Record<BlogLang, string>;

/**
 * Admin-editable article shape, stored as a JSON array in the
 * PlatformSettings key `blog.articles`. Source of truth for the public blog.
 */
export interface BlogArticle {
  slug: string;
  publishedAt: string;
  author: string;
  coverImage: string | null;
  tags: string[];
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText;
}

/**
 * Resolve a per-language field for the active language, falling back to
 * English then Estonian so a partially-translated article never renders blank.
 */
function resolve(field: Partial<LocalizedText> | undefined, lang: string): string {
  if (!field) return "";
  const f = field as Record<string, string | undefined>;
  return (f[lang] || f.en || f.et || "").trim();
}

// Eager-load all markdown files at build time
const modules = import.meta.glob("/src/content/blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function parseFrontmatter(raw: string): { data: Record<string, any>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, fm, body] = match;
  const data: Record<string, any> = {};
  const lines = fm.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value: any = line.slice(idx + 1).trim();
    if (value === "" || value === "null") {
      value = null;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: body ?? "" };
}

function buildPost(filename: string, raw: string): BlogPost | null {
  const { data, body } = parseFrontmatter(raw);
  if (!data.slug || !data.title) return null;
  return {
    slug: String(data.slug),
    title: String(data.title),
    titleEn: data.titleEn ? String(data.titleEn) : undefined,
    excerpt: data.excerpt ? String(data.excerpt) : "",
    excerptEn: data.excerptEn ? String(data.excerptEn) : undefined,
    publishedAt: data.publishedAt ? String(data.publishedAt) : "1970-01-01",
    author: data.author ? String(data.author) : "Ruumly",
    language: data.language ? String(data.language) : "et",
    coverImage: data.coverImage && data.coverImage !== "null" ? String(data.coverImage) : null,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: body.trim(),
    filename,
  };
}

function loadAll(): BlogPost[] {
  const posts: BlogPost[] = [];
  for (const [path, raw] of Object.entries(modules)) {
    const filename = path.split("/").pop() ?? path;
    const post = buildPost(filename, raw);
    if (post) posts.push(post);
  }
  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function localized(post: BlogPost, language: string): BlogPost {
  if (language === "en" && (post.titleEn || post.excerptEn)) {
    return {
      ...post,
      title: post.titleEn ?? post.title,
      excerpt: post.excerptEn ?? post.excerpt,
    };
  }
  return post;
}

export function getAllPosts(language: string): BlogPost[] {
  const all = loadAll();
  // Prefer posts authored in the requested language; fall back to ET otherwise.
  const inLang = all.filter((p) => p.language === language);
  const fallback = all.filter((p) => p.language === "et" && !inLang.some((x) => x.slug === p.slug));
  return [...inLang, ...fallback].map((p) => localized(p, language));
}

export function getPostBySlug(slug: string, language: string): BlogPost | null {
  const all = loadAll();
  const exact = all.find((p) => p.slug === slug && p.language === language);
  const fallback = all.find((p) => p.slug === slug);
  const post = exact ?? fallback ?? null;
  return post ? localized(post, language) : null;
}

export function getRelatedPosts(post: BlogPost, limit: number, language: string): BlogPost[] {
  return getAllPosts(language)
    .filter((p) => p.slug !== post.slug && p.tags.some((t) => post.tags.includes(t)))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Admin-editable articles (PlatformSettings `blog.articles`) → BlogPost
// ---------------------------------------------------------------------------

/** Safely JSON-parse the `blog.articles` settings string. Returns [] on error. */
export function parseArticles(json: string | undefined): BlogArticle[] {
  if (!json || !json.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a === "object" && typeof a.slug === "string" && a.slug.trim())
      .map((a: any) => ({
        slug: String(a.slug),
        publishedAt: a.publishedAt ? String(a.publishedAt) : "1970-01-01",
        author: a.author ? String(a.author) : "Ruumly",
        coverImage: a.coverImage && a.coverImage !== "null" ? String(a.coverImage) : null,
        tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
        title: { et: "", en: "", ru: "", lv: "", lt: "", ...(a.title || {}) },
        excerpt: { et: "", en: "", ru: "", lv: "", lt: "", ...(a.excerpt || {}) },
        body: { et: "", en: "", ru: "", lv: "", lt: "", ...(a.body || {}) },
      }));
  } catch {
    return [];
  }
}

/** Resolve a single article to a BlogPost for the active language. */
export function articleToPost(article: BlogArticle, lang: string): BlogPost {
  return {
    slug: article.slug,
    title: resolve(article.title, lang) || article.slug,
    excerpt: resolve(article.excerpt, lang),
    publishedAt: article.publishedAt || "1970-01-01",
    author: article.author || "Ruumly",
    language: lang,
    coverImage: article.coverImage && article.coverImage !== "null" ? article.coverImage : null,
    tags: Array.isArray(article.tags) ? article.tags : [],
    body: resolve(article.body, lang),
    filename: `${article.slug}.json`,
  };
}

/** Resolve all articles to BlogPosts (newest first) for the active language. */
export function articlesToPosts(articles: BlogArticle[], lang: string): BlogPost[] {
  return articles
    .map((a) => articleToPost(a, lang))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}