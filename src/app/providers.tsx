'use client';

import { SWRConfig } from 'swr';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,     // atualiza ao trocar de aba
        revalidateOnReconnect: true, // atualiza ao voltar conexão
        refreshInterval: 10000,      // polling global: 10s
        fetcher: (resource) => fetch(resource).then(res => res.json()),
      }}
    >
      {children}
    </SWRConfig>
  );
}
