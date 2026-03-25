import { Wrench } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function MaintenancePage() {
  const settings = usePlatformSettings();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <SEO
        title="Hooldus — Ruumly"
        description="Ruumly on hetkel hoolduses. Tuleme varsti tagasi."
        noindex={true}
      />
      <div className="mb-6 rounded-full bg-accent/10 p-4">
        <Wrench className="h-10 w-10 text-accent" />
      </div>

      <h1 className="mb-3 text-3xl font-bold text-foreground">
        {t("maintenance.title")}
      </h1>

      <p className="mb-6 max-w-md text-muted-foreground">
        {t("maintenance.desc")}
      </p>

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
