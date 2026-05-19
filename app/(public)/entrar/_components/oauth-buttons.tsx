import Link from "next/link";

import { Button } from "@/app/components/ui/button";

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="glass" className="w-full justify-center">
        <Link href="/api/auth/google/start" aria-label="Entrar com Google">
          Entrar com Google
        </Link>
      </Button>
      {/* Apple sign-in oculto ate Apple Developer config (Services ID + P8) estar pronto. */}
    </div>
  );
}
