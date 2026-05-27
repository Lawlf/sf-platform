const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = "conteudos";

export function audioPublicUrl(objectPath: string | undefined): string | null {
  if (!objectPath || !BASE) return null;
  return `${BASE}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}
