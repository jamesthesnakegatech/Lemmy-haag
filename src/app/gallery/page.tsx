import * as React from 'react';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';
import type { GalleryItem } from '@/lib/types';
import BreadcrumbsNav from '@/components/appbar/BreadcrumbsNav';
import GalleryGrid from '@/components/gallery/GalleryGrid';

export const revalidate = 60;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>;
}) {
  const sp = await searchParams;
  const folderId = sp.folderId;

  // Build URL with parentId + paging/sort
  const base = routes.gallery(folderId);
  const url = `${base}${base.includes('?') ? '&' : '?'}limit=40&sort=-date`;

  const data = await api<{ items: GalleryItem[]; nextCursor?: string }>(url, {
    next: { revalidate },
  });

  return (
    <>
      <BreadcrumbsNav />
      <GalleryGrid
        key={folderId ?? 'root'} // force remount on folder navigation to reset state
        initialItems={data.items}
        initialNextCursor={data.nextCursor}
        folderId={folderId}
      />
    </>
  );
}
