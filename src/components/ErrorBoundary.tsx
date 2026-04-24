import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const errorStrings: Record<string, { title: string; sub: string; btn: string }> = {
        et: { title: "Midagi läks valesti", sub: "Palun laadige leht uuesti.", btn: "Lae uuesti" },
        en: { title: "Something went wrong", sub: "Please reload the page.", btn: "Reload" },
        ru: { title: "Что-то пошло не так", sub: "Пожалуйста, перезагрузите страницу.", btn: "Перезагрузить" },
        lv: { title: "Kaut kas nogāja greizi", sub: "Lūdzu, pārlādējiet lapu.", btn: "Pārlādēt" },
        lt: { title: "Kažkas nepavyko", sub: "Prašome perkrauti puslapį.", btn: "Perkrauti" },
      };
      const lang = (typeof window !== "undefined" && localStorage.getItem("ruumly-lang")) || "et";
      const strings = errorStrings[lang] || errorStrings.et;
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="font-display text-xl font-bold">{strings.title}</h2>
          <p className="text-sm text-muted-foreground">{strings.sub}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {strings.btn}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
