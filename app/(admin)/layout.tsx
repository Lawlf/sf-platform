import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Role gate is added in Plan 6.
  return <div className="min-h-screen">{children}</div>;
}
