import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // This is a dummy endpoint to satisfy Next.js structure if needed, 
    // real persistence is client-side via Zustand currently.
    return NextResponse.json({ status: 'ok' });
}
