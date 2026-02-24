import { NextResponse } from 'next/server';
import { db } from '../_mock/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('parentId') || undefined;
  const items = db.listFolder(parentId);
  return NextResponse.json({ items, nextCursor: null });
}
