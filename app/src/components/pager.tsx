import { useState } from "react";
import { Button } from "@/components/ui/button";

export function usePageTokens() {
  const [token, setToken] = useState<string | undefined>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  return {
    token,
    canPrev: history.length > 0,
    next: (nextToken?: string) => {
      if (!nextToken) return;
      setHistory((h) => [...h, token]);
      setToken(nextToken);
    },
    prev: () => {
      if (!history.length) return;
      setToken(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
    },
  };
}

export function Pager({
  canPrev,
  nextToken,
  busy,
  onPrev,
  onNext,
}: {
  canPrev: boolean;
  nextToken?: string;
  busy: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!canPrev && !nextToken) return null;
  return (
    <div className="flex items-center justify-end gap-2 py-3">
      <Button variant="outline" size="sm" disabled={!canPrev || busy} onClick={onPrev}>
        Previous page
      </Button>
      <Button variant="outline" size="sm" disabled={!nextToken || busy} onClick={onNext}>
        Next page
      </Button>
    </div>
  );
}
