import { Wrench, WifiOff, RefreshCw } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

interface Props {
  apiUnreachable?: boolean;
}

export default function MaintenancePage({ apiUnreachable }: Props) {
  const settings = usePlatformSettings();
  const { t } = useLanguage();

  const isUnreachable = apiUnreachable && !settings.maintenanceMode;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <SEO
        title={isUnreachable ? `${t("maintenance.unreachable.seoTitle")} — Ruumly` : `${t("maintenance.seoTitle")} — Ruumly`}
        description={isUnreachable ? t("maintenance.unreachable.seoDesc") : t("maintenance.seoDesc")}
        noindex={true}
      />
      <div className="mb-6 rounded-full bg-accent/10 p-4">
        {isUnreachable ? (
          <WifiOff className="h-10 w-10 text-accent" />
        ) : (
          <Wrench className="h-10 w-10 text-accent" />
        )}
      </div>

      <h1 className="mb-3 text-3xl font-bold text-foreground">
        {isUnreachable ? t("maintenance.unreachable.title") : t("maintenance.title")}
      </h1>

      <p className="mb-6 max-w-md text-muted-foreground">
        {isUnreachable ? t("maintenance.unreachable.desc") : t("maintenance.desc")}
      </p>

      {isUnreachable && (
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("maintenance.unreachable.retry")}
        </Button>
      )}

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        {settings.siteEmail && (
          <a
            href={`mailto:${settings.siteEmail}`}
            className="text-accent hover:underline"
          >
            {settings.siteEmail}
          </a>
        )}
        {settings.sitePhone && (
          <span>{settings.sitePhone}</span>
        )}
      </div>
    </div>
  );
}
