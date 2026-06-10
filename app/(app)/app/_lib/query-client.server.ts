import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

// Um QueryClient por request (React cache dedup), usado só nos Server Components
// para pré-buscar e desidratar dados antes do cliente montar. O staleTime espelha
// o do provider do browser para a primeira hidratação não disparar refetch.
export const getServerQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
        },
      },
    }),
);
