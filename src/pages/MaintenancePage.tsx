import { Wrench } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export default function MaintenancePage() {
  const settings = usePlatformSettings();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 rounded-full bg-accent/10 p-4">
        <Wrench className="h-10 w-10 text-accent" />
      </div>

      <h1 className="mb-3 text-3xl font-bold text-foreground">
        Tuleme varsti tagasi
      </h1>

      <p className="mb-6 max-w-md text-muted-foreground">
        Ruumly on hetkel hoolduses. Töötame platvormi parandamise kallal ja oleme peagi tagasi.
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
