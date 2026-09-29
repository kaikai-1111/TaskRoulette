"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { signInWithGoogle } from "@/app/account/actions";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

// Uses Google Identity Services' own hosted button + ID-token flow — no
// client secret or redirect-URI exchange needed (unlike a full OAuth
// authorization-code flow), just a public Client ID and server-side
// verification of the token it hands back (see signInWithGoogle).
export default function GoogleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) return null; // not configured yet — render nothing rather than a dead button

  function handleScriptLoad() {
    if (!window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId!,
      callback: async (resp) => {
        setError(null);
        const result = await signInWithGoogle(resp.credential);
        if (result.ok) onSuccess();
        else setError(result.error);
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div ref={buttonRef} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
