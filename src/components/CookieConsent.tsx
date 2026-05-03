import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { initGA } from "@/lib/analytics";

const CONSENT_KEY = "ruumly-cookie-consent";

export default function CookieConsent() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) !== "true") {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    setVisible(false);
    const gaId = import.meta.env.VITE_GA_ID;
    if (gaId) initGA(gaId);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background p-4">
      <div className="container-wide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("consent.text")}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cookies">{t("consent.readMore")}</Link>
          </Button>
          <Button size="sm" onClick={accept}>
            {t("consent.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
