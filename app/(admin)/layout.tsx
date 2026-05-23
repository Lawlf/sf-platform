import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <div className="min-h-screen">{children}</div>;
}
