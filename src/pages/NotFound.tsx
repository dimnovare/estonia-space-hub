import { ErrorState } from "@/components/ErrorState";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  return (
    <>
      <SEO title="Lehte ei leitud — Ruumly" description="" noindex={true} />
      <ErrorState kind="notFound" />
    </>
  );
};

export default NotFound;
