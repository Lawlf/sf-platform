"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";
import { createMeiProfileAction } from "@/app/(app)/app/perfil/_actions/create-mei-profile.action";

export function CreateMeiCta() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createMeiProfileAction({});
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="brand"
      size="lg"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className="w-full"
    >
      {pending ? <Spinner size={16} decorative /> : <Building2 size={18} strokeWidth={1.75} aria-hidden />}
      Sou MEI / tenho CNPJ
    </Button>
  );
}
