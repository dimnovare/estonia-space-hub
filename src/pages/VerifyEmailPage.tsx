import { useEffect, useState } from "react";
import { useSearchParams, Link } from "@/i18n/routing";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/i18n/LanguageContext";
import { authService } from "@/services";

type Status = "loading" | "success" | "error" | "no-token";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("no-token");
      return;
    }
    authService
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [params]);

  return (
    <>
      <SEO title={t("verify.seoTitle")} description={t("verify.seoTitle")} noindex />
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center space-y-6">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">{t("verify.loading")}</p>
            </>
          )}

          {status === "no-token" && (
            <>
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h1 className="text-2xl font-bold text-foreground">{t("verify.noToken")}</h1>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-14 w-14 text-success" />
              <h1 className="text-2xl font-bold text-foreground">{t("verify.success")}</h1>
              <p className="text-muted-foreground">{t("verify.successSub")}</p>
              <Button asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h1 className="text-2xl font-bold text-foreground">{t("verify.error")}</h1>
              <p className="text-muted-foreground">{t("verify.errorSub")}</p>
              <Button variant="outline" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
