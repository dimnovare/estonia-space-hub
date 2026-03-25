import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { ShieldOff, ServerCrash, Search } from "lucide-react";

type ErrorKind = "forbidden" | "notFound" | "serverError";

interface ErrorStateProps {
  kind: ErrorKind;
  message?: string;
}

const CONFIG: Record<ErrorKind, {
  icon: typeof ShieldOff;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  ctaTo: string;
}> = {
  forbidden: {
    icon: ShieldOff,
    titleKey: "error.forbidden.title",
    descKey: "error.forbidden.desc",
    ctaKey: "error.forbidden.cta",
    ctaTo: "/",
  },
  notFound: {
    icon: Search,
    titleKey: "error.notFound.title",
    descKey: "error.notFound.desc",
    ctaKey: "error.notFound.cta",
    ctaTo: "/search",
  },
  serverError: {
    icon: ServerCrash,
    titleKey: "error.server.title",
    descKey: "error.server.desc",
    ctaKey: "error.server.cta",
    ctaTo: "/",
  },
};

export function ErrorState({ kind, message }: ErrorStateProps) {
  const { t } = useLanguage();
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
        {t(cfg.titleKey)}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {message || t(cfg.descKey)}
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link to={cfg.ctaTo}>{t(cfg.ctaKey)}</Link>
        </Button>
      </div>
    </div>
  );
}
