"use client";

import { useEffect } from "react";
// Imports lib/observability/errors directly, not the lib/observability barrel: the barrel
// also re-exports the PostHog wrapper (server only, `import "server-only"`), which would
// break this Client Component's bundle.
import { captureError } from "@/lib/observability/errors";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="pl">
      <body>
        <h2>Coś poszło nie tak.</h2>
        <button onClick={() => retry()}>Spróbuj ponownie</button>
      </body>
    </html>
  );
}
