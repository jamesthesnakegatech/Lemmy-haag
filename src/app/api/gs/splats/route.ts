import { NextResponse } from 'next/server';
import { db } from '../../_mock/db';

export async function GET() {
  return NextResponse.json({ groups: db.listSplats(), nextCursor: null });
}
