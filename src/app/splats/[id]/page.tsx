import * as React from 'react';
import { Box, Stack, Typography, Divider, Chip } from '@mui/material';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';
import type { SplatRef } from '@/lib/types';
import SceneViewer from '@/components/viewer/SceneViewer';

export const revalidate = 60;

export default async function SplatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);

  let splat: SplatRef | null = null;
  try {
    splat = await api<SplatRef>(routes.splats.one(id), { next: { revalidate } });
  } catch {
    // If the API 404s or errors, keep splat null; the viewer will render empty
  }

  const title = splat?.name ?? `Splat ${id}`;
  const status = splat?.status ?? 'processing';
  const assetUrl = splat?.assetUrl; // may be undefined → viewer loads empty scene

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h5" sx={{ flex: 1 }} noWrap title={title}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={status}
          color={status === 'ready' ? 'success' : status === 'failed' ? 'error' : 'default'}
          sx={{ textTransform: 'capitalize' }}
        />
      </Stack>

      <Divider />

      {/* Viewer section */}
      <Box
        sx={{
          height: { xs: 420, sm: 520, md: 640, lg: 720 },
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <SceneViewer src={assetUrl} />
      </Box>

      {/* Simple meta; expand later as needed */}
      <Stack direction="row" spacing={3}>
        <Typography variant="body2" color="text.secondary">
          ID: {id}
        </Typography>
        {splat?.createdAt && (
          <Typography variant="body2" color="text.secondary">
            Created: {new Date(splat.createdAt).toLocaleString()}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
