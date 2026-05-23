import { redirect } from "next/navigation";

// Rota antiga consolidada em /app/dividas/nova/comprei como parte da unificação
// "Compras e Dívidas". URLs salvas/bookmarks ainda chegam aqui.
export default function ComprareiRedirect() {
  redirect("/app/dividas/nova/comprei");
}
