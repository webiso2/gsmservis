import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 dakika boyunca veriler taze kabul edilir
            gcTime: 1000 * 60 * 30, // 30 dakika sonra cache temizlenir (eski adıyla cacheTime)
            refetchOnWindowFocus: false, // Pencere odağı değiştiğinde tekrar çekme
            retry: 1, // Hata durumunda 1 kez tekrar dene
        },
    },
});
