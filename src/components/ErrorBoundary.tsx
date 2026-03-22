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
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="font-display text-xl font-bold">Midagi läks valesti</h2>
          <p className="text-sm text-muted-foreground">Palun laadige leht uuesti.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Lae uuesti
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
