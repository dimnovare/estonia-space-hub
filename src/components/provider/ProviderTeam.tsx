import { Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderTeam() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.team.title")}</h1>
      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-secondary/30 py-16 px-6 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-base font-semibold">{t("provider.team.comingSoon")}</p>
      </div>
    </div>
  );
}
