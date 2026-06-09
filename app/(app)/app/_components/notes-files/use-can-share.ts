import { useEffect, useState } from "react";

export function useCanShare(): boolean {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        window.matchMedia("(pointer: coarse)").matches,
    );
  }, []);
  return canShare;
}
