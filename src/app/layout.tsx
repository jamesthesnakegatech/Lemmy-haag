import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import AppAppBar from '@/components/appbar/AppAppBar';
import { ColorModeProvider } from '@/styles/ColorModeContext';

export const metadata = { title: 'Gaussian Splat Tool', description: 'Image → Scene' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Helps native controls respect both schemes */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <AppRouterCacheProvider>
          <ColorModeProvider>
            <AppAppBar />
            <main style={{ padding: 16 }}>{children}</main>
          </ColorModeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
