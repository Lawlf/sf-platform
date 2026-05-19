import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  // Auth gate is added in Plan 2. For now the route renders the placeholder.
  return <div className="min-h-screen">{children}</div>;
}
