import { NextResponse } from 'next/server';
import { db } from '../../../_mock/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = db.getJob(params.id);
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(job);
}
