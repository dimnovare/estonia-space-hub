import { Link, useParams } from "@/i18n/routing";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { getPostBySlug, getRelatedPosts, parseArticles, articlesToPosts } from "@/lib/blog";
import { SEO } from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { useHead } from "@unhead/react";

/**
 * Extra Open-Graph `article:*` meta for a blog post. Kept as its own component
 * so its `useHead` hook runs unconditionally (BlogPostPage early-returns before
 * the post is known); the SEO component owns the core title/description/OG tags.
 */
function ArticleMeta({
  publishedAt,
  author,
  tags,
}: {
  publishedAt: string;
  author?: string;
  tags: string[];
}) {
  useHead({
    meta: [
      { property: "article:published_time", content: new Date(publishedAt).toISOString() },
      ...(author ? [{ property: "article:author", content: author }] : []),
      ...tags.map((tag) => ({ property: "article:tag", content: tag })),
    ],
  });
  return null;
}

export default function BlogPostPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const settings = usePlatformSettings();
  const enabled = String(settings.blog?.enabled ?? "false") === "true";

  if (!enabled) return <NotFound />;

  // Prefer admin-editable articles from PlatformSettings (`blog.articles`).
  // Fall back to the build-time markdown glob until content is seeded.
  const articles = parseArticles(settings.blog?.articles);
  const useArticles = articles.length > 0;
  const allPosts = useArticles ? articlesToPosts(articles, language) : [];

  const post = useArticles
    ? allPosts.find((p) => p.slug === slug) ?? null
    : getPostBySlug(slug, language);
  if (!post) return <NotFound />;

  const related = useArticles
    ? allPosts
        .filter((p) => p.slug !== post.slug && p.tags.some((tag) => post.tags.includes(tag)))
        .slice(0, 3)
    : getRelatedPosts(post, 3, language);

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(
      language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB",
      { year: "numeric", month: "long", day: "numeric" },
    );

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: new Date(post.publishedAt).toISOString(),
    author: post.author ? { "@type": "Person", name: post.author } : undefined,
    image: post.coverImage || undefined,
  };

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
        structuredData={articleStructuredData}
      />
      <ArticleMeta
        publishedAt={post.publishedAt}
        author={post.author}
        tags={post.tags}
      />

      <div className="container-wide py-12 md:py-16">
        <Link
          to="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("blog.backToBlog")}
        </Link>

        <article className="mx-auto max-w-[720px] animate-slide-up">
          <header className="mb-8">
            <p className="eyebrow mb-3">{t("blog.eyebrow")}</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-navy-ink md:text-[40px]">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono-label text-[12px] uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {dateFmt(post.publishedAt)}
              </span>
              {post.author && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {post.author}
                </span>
              )}
            </div>

            {post.excerpt && (
              <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{post.excerpt}</p>
            )}

            {post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="mb-10 aspect-[16/9] w-full rounded-lg border border-line object-cover shadow-card"
            />
          ) : (
            <div
              className="photo-placeholder--soft mb-10 flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-line shadow-card"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--accent) / 0.10), hsl(var(--teal) / 0.16))",
              }}
            >
              <span className="photo-placeholder__cap">{t("blog.eyebrow")}</span>
            </div>
          )}

          <div className="blog-prose text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>
        </article>

        {related.length > 0 && (
          <div className="mx-auto mt-16 max-w-[720px] border-t border-line pt-10">
            <p className="eyebrow mb-2">{t("blog.relatedPosts")}</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="group flex h-full flex-col rounded-lg border border-line bg-card p-5 shadow-card transition-[box-shadow,transform] hover:-translate-y-[3px] hover:shadow-elevated"
                  >
                    <div className="mb-1.5 font-mono-label text-[11px] uppercase tracking-wide text-muted-foreground">
                      {dateFmt(p.publishedAt)}
                    </div>
                    <h3 className="font-display text-base font-bold leading-snug text-navy-ink transition-colors group-hover:text-primary">
                      {p.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {t("blog.allPosts")}
          </Link>
        </div>
      </div>
    </>
  );
}
