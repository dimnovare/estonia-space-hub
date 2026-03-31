import { ErrorState } from "@/components/ErrorState";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/i18n/LanguageContext";

const NotFound = () => {
  const { t } = useLanguage();
  return (
    <>
      <SEO title={`${t("seo.notFound")} — Ruumly`} description="" noindex={true} />
      <ErrorState kind="notFound" />
    </>
  );
};

export default NotFound;
