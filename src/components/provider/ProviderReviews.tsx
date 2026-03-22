import { Star } from "lucide-react";

const mockReviews = [
  { id: 1, author: "Andres T.", rating: 5, text: "Suurepärane laoruumid ja kiire teenindus!", date: "2026-03-10", listing: "Laobox Tallinn" },
  { id: 2, author: "Kati M.", rating: 4, text: "Hea asukoht, kergesti ligipääsetav.", date: "2026-02-28", listing: "Laobox Tallinn" },
  { id: 3, author: "Peeter K.", rating: 5, text: "Turvaline ja puhas. Soovitan!", date: "2026-02-15", listing: "SecureStore Ülemiste" },
];

export default function ProviderReviews() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Hinnangud</h1>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Star className="h-5 w-5 fill-warning text-warning" />
          <span className="font-display text-xl font-bold">4.7</span>
        </div>
        <span className="text-sm text-muted-foreground">{mockReviews.length} hinnangut</span>
      </div>
      <div className="mt-6 space-y-3">
        {mockReviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.author}</span>
                <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>
              </div>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.listing}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
