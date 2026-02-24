import { NextResponse } from 'next/server';
import { db } from '../../_mock/db';

export async function POST() {
  const job = db.createJob();
  return NextResponse.json(job, { status: 202 });
}
