import { Link, useSearchParams } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { getAllPosts } from "@/lib/blog";
import { SEO } from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";

const PAGE_SIZE = 10;

export default function BlogIndexPage() {
  const { language, t } = useLanguage();
  const settings = usePlatformSettings();
  const enabled = String(settings.blog?.enabled ?? "false") === "true";

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  if (!enabled) return <NotFound />;

  const posts = getAllPosts(language);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const slice = posts.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const goTo = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setSearchParams(next);
  };

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(
      language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB",
      { year: "numeric", month: "long", day: "numeric" },
    );

  return (
    <>
      <SEO title={t("blog.title")} description={t("blog.subtitle")} path="/blog" />

      <div className="container-wide py-12 md:py-16">
        <header className="mb-10 max-w-2xl animate-slide-up">
          <p className="eyebrow mb-3">{t("blog.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-ink md:text-4xl">
            {t("blog.title")}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{t("blog.subtitle")}</p>
        </header>

        {slice.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-line bg-card px-6 py-16 text-center shadow-card">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-secondary">
              <Newspaper className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="font-display text-lg font-bold text-navy-ink">{t("blog.noPosts")}</h2>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {slice.map((post, i) => (
              <li key={post.slug} className="animate-slide-up" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-card shadow-card transition-[box-shadow,transform] hover:-translate-y-[3px] hover:shadow-elevated"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="photo-placeholder--soft flex h-full w-full items-center justify-center"
                        style={{
                          backgroundImage:
                            "linear-gradient(135deg, hsl(var(--accent) / 0.10), hsl(var(--teal) / 0.16))",
                        }}
                      >
                        <span className="photo-placeholder__cap">{t("blog.eyebrow")}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-center gap-1.5 font-mono-label text-[11px] uppercase tracking-wide text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {dateFmt(post.publishedAt)}
                    </div>

                    <h2 className="mb-2 font-display text-lg font-bold leading-snug text-navy-ink transition-colors group-hover:text-primary">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-ink-2">{post.excerpt}</p>
                    )}

                    {post.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      {t("blog.readMore")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-3" aria-label={t("blog.title")}>
            <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => goTo(current - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> {t("blog.prevPage")}
            </Button>
            <span className="font-mono-label text-[12px] text-muted-foreground">
              {current} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={current >= totalPages} onClick={() => goTo(current + 1)}>
              {t("blog.nextPage")} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </>
  );
}
