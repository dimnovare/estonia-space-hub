import { Link, useParams } from "@/i18n/routing";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, FileText } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { SEO } from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { Helmet } from "react-helmet-async";

export default function BlogPostPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const settings = usePlatformSettings() as any;
  const enabled = String(settings.blog?.enabled ?? "false") === "true";

  if (!enabled) return <NotFound />;

  const post = getPostBySlug(slug, language);
  if (!post) return <NotFound />;

  const related = getRelatedPosts(post, 3, language);

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
      <Helmet>
        <meta property="article:published_time" content={new Date(post.publishedAt).toISOString()} />
        {post.author && <meta property="article:author" content={post.author} />}
        {post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>

      <main className="container-wide py-10">
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> {t("blog.backToBlog")}
        </Link>

        <article className="mx-auto max-w-[720px]">
          <header className="mb-8">
            <div className="mb-3 text-sm text-muted-foreground">
              {dateFmt(post.publishedAt)} · {post.author}
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
            {post.excerpt && (
              <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
            )}
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              className="mb-8 w-full rounded-2xl object-cover"
            />
          )}

          <div className="blog-prose text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>
        </article>

        {related.length > 0 && (
          <section className="mx-auto mt-16 max-w-[720px]">
            <h2 className="mb-4 text-xl font-semibold">{t("blog.relatedPosts")}</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="group block rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="mb-1 text-xs text-muted-foreground">{dateFmt(p.publishedAt)}</div>
                    <h3 className="text-base font-semibold leading-snug group-hover:text-accent">
                      {p.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-4 w-4" /> {t("blog.allPosts")}
          </Link>
        </div>
      </main>
    </>
  );
}