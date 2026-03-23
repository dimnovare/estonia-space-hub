import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative mb-6">
        <Search className="h-16 w-16 text-muted-foreground/20" />
      </div>

      <h1 className="font-display text-6xl font-bold text-foreground">404</h1>

      <p className="mt-3 text-xl font-medium text-muted-foreground">
        Lehte ei leitud
      </p>

      <p className="mt-2 max-w-md text-sm text-muted-foreground/80">
        Otsitavat lehte ei eksisteeri või see on eemaldatud.
        Kontrolli aadressi või mine tagasi esilehele.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Mine tagasi
        </Button>
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            Esileht
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
