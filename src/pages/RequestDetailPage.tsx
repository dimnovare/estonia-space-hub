import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";

export default function RequestDetailPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/account?tab=bookings", { replace: true });
  }, [navigate]);
  return (
    <>
      <SEO title={t("seo.requestDetail")} description={t("seo.requestDetailDesc")} noindex />
    </>
  );
}
