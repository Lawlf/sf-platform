import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { requireElevatedAdmin } from "@/presentation/http/middleware/require-elevated-admin";

import { AdminSidebar } from "./admin/_components/admin-sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "/admin";
  await requireElevatedAdmin(pathname);
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
    </div>
  );
}
