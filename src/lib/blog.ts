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