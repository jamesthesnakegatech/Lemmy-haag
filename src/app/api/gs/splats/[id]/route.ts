import { NextResponse } from 'next/server';
import { db } from '../../../_mock/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const s = db.splats.get(params.id);
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(s);
}
