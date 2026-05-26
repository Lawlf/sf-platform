"use client";

import { PasskeyEnroll } from "./passkey-enroll.client";
import { TotpEnroll } from "./totp-enroll.client";

interface SecurityFactorsProps {
  hasTotp: boolean;
  passkeyCount: number;
}

export function SecurityFactors({ hasTotp, passkeyCount }: SecurityFactorsProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light flex flex-col gap-4 rounded-2xl p-4">
        <div>
          <p className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            Autenticador (TOTP)
          </p>
          <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
            {hasTotp
              ? "TOTP configurado. Configure novamente para rotacionar o segredo."
              : "Vincule um app autenticador (Google Authenticator, Authy, 1Password, etc.)."}
          </p>
        </div>
        <TotpEnroll />
      </section>

      <section className="glass-light flex flex-col gap-4 rounded-2xl p-4">
        <div>
          <p className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">Passkey</p>
          <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
            {passkeyCount === 0
              ? "Nenhuma passkey registrada. Use Face ID, Touch ID ou chave de segurança."
              : `${passkeyCount} passkey${passkeyCount > 1 ? "s" : ""} registrada${passkeyCount > 1 ? "s" : ""}. Adicione mais abaixo.`}
          </p>
        </div>
        <PasskeyEnroll />
      </section>
    </div>
  );
}
