import { NextResponse } from "next/server";

import { loadEnv } from "@/infrastructure/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDER_FINGERPRINT = "FILL_AFTER_PWABUILDER_PACKAGE";

export async function GET() {
  const env = loadEnv();
  const packageName = env.ANDROID_PACKAGE_NAME ?? "br.com.saborfinanceiro.twa";
  const fingerprints = (env.ANDROID_CERT_SHA256 ?? PLACEHOLDER_FINGERPRINT)
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
