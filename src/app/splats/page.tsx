import * as React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';
import type { SplatRef } from '@/lib/types';
import SplatCard from '@/components/splats/SplatCard';

export const revalidate = 60;

type Group = { date: string; items: SplatRef[] };

export default async function SplatsPage() {
  const data = await api<{ groups: Group[]; nextCursor?: string }>(
    routes.splats.list + '?limit=60',
    { next: { revalidate } },
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {data.groups.map((g) => (
        <Box key={g.date} component="section" sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Typography variant="h6">{new Date(g.date).toLocaleDateString()}</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {/* Responsive, standardized grid (CSS Grid to avoid MUI Grid version quirks) */}
          <Box
            display="grid"
            gap={2}
            sx={{
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
                xl: 'repeat(6, minmax(0, 1fr))',
              },
            }}
          >
            {g.items.map((s) => (
              <Box key={s.id}>
                <SplatCard splat={s} />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
