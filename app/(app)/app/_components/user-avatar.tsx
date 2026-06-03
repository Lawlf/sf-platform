import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  dataUrl?: string | null | undefined;
  displayName: string;
  className?: string;
}

export function UserAvatar({ dataUrl, displayName, className }: UserAvatarProps) {
  if (dataUrl) {
    return (
      <span
        role="img"
        aria-label="Foto de perfil"
        className={cn("bg-cover bg-center bg-no-repeat", className)}
        style={{ backgroundImage: `url(${dataUrl})` }}
      />
    );
  }

  const initials = (displayName || "??").slice(0, 2).toUpperCase();
  return <span className={className}>{initials}</span>;
}
