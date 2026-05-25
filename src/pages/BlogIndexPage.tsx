import { Link, useSearchParams } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { getAllPosts } from "@/lib/blog";
import { SEO } from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

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
      <SEO
        title={t("blog.title")}
        description={t("blog.title")}
        path="/blog"
      />
      <div className="container-wide py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("blog.title")}</h1>
        </header>

        {slice.length === 0 ? (
          <div className="rounded-2xl bg-secondary/30 py-16 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-base font-semibold">{t("blog.noPosts")}</p>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {slice.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-secondary/40">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText className="h-10 w-10 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="mb-2 text-xs text-muted-foreground">{dateFmt(post.publishedAt)}</div>
                    <h2 className="mb-2 text-lg font-semibold leading-snug group-hover:text-accent">
                      {post.title}
                    </h2>
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={current <= 1}
              onClick={() => goTo(current - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> {t("blog.prevPage")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {current} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= totalPages}
              onClick={() => goTo(current + 1)}
            >
              {t("blog.nextPage")} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </>
  );
}