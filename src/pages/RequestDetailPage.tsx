import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const requestsData: Record<string, {
  id: string;
  listing: string;
  type: string;
  date: string;
  status: string;
  statusColor: string;
  address: string;
  city: string;
  period: string;
  price: string;
  notes: string;
  timeline: { date: string; event: string; icon: "check" | "clock" | "alert" }[];
}> = {
  r1: {
    id: "r1",
    listing: "Laobox Tallinn Kesklinn",
    type: "Laopind",
    date: "2026-03-18",
    status: "Ootel",
    statusColor: "bg-warning",
    address: "Pärnu mnt 139",
    city: "Tallinn",
    period: "01.04.2026 – 30.06.2026",
    price: "49€/kuu",
    notes: "Vajan köetud laoruumi mööbli hoiustamiseks.",
    timeline: [
      { date: "18.03.2026", event: "Päring esitatud", icon: "check" },
      { date: "18.03.2026", event: "Ootab kinnitust", icon: "clock" },
    ],
  },
  r2: {
    id: "r2",
    listing: "KoliExpress",
    type: "Kolimine",
    date: "2026-03-15",
    status: "Kinnitatud",
    statusColor: "bg-success",
    address: "Peterburi tee 81",
    city: "Tallinn",
    period: "22.03.2026",
    price: "45€/h (hinnanguline 3h)",
    notes: "2-toaline korter, 3. korrus, lifti pole.",
    timeline: [
      { date: "15.03.2026", event: "Päring esitatud", icon: "check" },
      { date: "16.03.2026", event: "Teenusepakkuja kinnitanud", icon: "check" },
      { date: "17.03.2026", event: "Broneering kinnitatud", icon: "check" },
    ],
  },
  r3: {
    id: "r3",
    listing: "HaagisRent Tallinn",
    type: "Haagise rent",
    date: "2026-03-10",
    status: "Lõpetatud",
    statusColor: "bg-muted-foreground",
    address: "Tehnika 14",
    city: "Tallinn",
    period: "10.03.2026 – 12.03.2026",
    price: "25€/päev × 2 päeva = 50€",
    notes: "",
    timeline: [
      { date: "10.03.2026", event: "Päring esitatud", icon: "check" },
      { date: "10.03.2026", event: "Kinnitatud", icon: "check" },
      { date: "12.03.2026", event: "Haagis tagastatud", icon: "check" },
      { date: "12.03.2026", event: "Lõpetatud", icon: "check" },
    ],
  },
};

const statusIcons = {
  check: CheckCircle,
  clock: Clock,
  alert: AlertCircle,
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const request = id ? requestsData[id] : null;

  if (!request) {
    return (
      <div className="container-wide py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Päringut ei leitud</h1>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">Tagasi</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-wide py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Tagasi minu kontole
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card-prominent p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{request.type}</span>
                <h1 className="mt-1 font-display text-2xl font-bold">{request.listing}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {request.address}, {request.city}
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${request.statusColor}`}>
                {request.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="card-prominent p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Broneeringu andmed</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-xs text-muted-foreground">Periood</div>
                <div className="mt-1 text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-accent" /> {request.period}
                </div>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-xs text-muted-foreground">Hind</div>
                <div className="mt-1 text-sm font-medium">{request.price}</div>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-xs text-muted-foreground">Päringu kuupäev</div>
                <div className="mt-1 text-sm font-medium">{request.date}</div>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="text-xs text-muted-foreground">Päringu ID</div>
                <div className="mt-1 text-sm font-medium font-mono">{request.id.toUpperCase()}</div>
              </div>
            </div>
            {request.notes && (
              <div className="mt-4 rounded-lg bg-secondary p-4">
                <div className="text-xs text-muted-foreground">Märkused</div>
                <div className="mt-1 text-sm">{request.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline sidebar */}
        <div className="card-prominent p-6 h-fit">
          <h2 className="font-display text-lg font-semibold mb-4">Ajalugu</h2>
          <div className="space-y-4">
            {request.timeline.map((item, i) => {
              const Icon = statusIcons[item.icon];
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Icon className={`h-5 w-5 ${item.icon === "check" ? "text-accent" : item.icon === "clock" ? "text-warning" : "text-destructive"}`} />
                    {i < request.timeline.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-sm font-medium">{item.event}</div>
                    <div className="text-xs text-muted-foreground">{item.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
