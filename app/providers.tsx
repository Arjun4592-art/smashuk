'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
export function Providers({
  children
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  }));
  return <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position='top-right' toastOptions={{
        duration: 3000,
        style: {
          background: '#202223',
          color: '#fff',
          fontSize: '13px',
          borderRadius: '8px',
          padding: '12px 16px'
        },
        success: {
          iconTheme: {
            primary: '#008060',
            secondary: '#fff'
          }
        },
        error: {
          iconTheme: {
            primary: '#D82C0D',
            secondary: '#fff'
          }
        }
      }} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>;
}
