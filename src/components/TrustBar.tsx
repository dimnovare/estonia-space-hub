import { ShieldCheck, Map, Wallet, MessageCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Home trust strip (01-public §B): a single muted, centered row of four
 * icon+label items — NOT stat cards. Exact items per spec:
 *   Verified-partner badge · Map + search visibility · Transparent pricing · Customer support
 *
 * The first item names the BADGE, not the directory. `Supplier.IsVerified`
 * defaults to false and is only ever set by the admin verify endpoint, so
 * almost none of the ~1,186 imported directory rows carry it — a strip that
 * read "Verified partners" asserted something we cannot substantiate.
 */
export default function TrustBar() {
  const { t } = useLanguage();

  const items = [
    { icon: ShieldCheck,    label: t("trustStrip.verified") },
    { icon: Map,            label: t("trustStrip.mapSearch") },
    { icon: Wallet,         label: t("trustStrip.transparent") },
    { icon: MessageCircle,  label: t("trustStrip.support") },
  ];

  return (
    <section className="container-wide border-t border-border py-5 md:py-6">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {items.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="h-[18px] w-[18px] text-teal-deep" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
