import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getTrainingFolder } from '@/server/settings';
export async function GET(request: NextRequest) {
  try {
    const image = request.nextUrl.searchParams.get('path');
    if (!image) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    const [root, target] = await Promise.all([fs.realpath(await getTrainingFolder()), fs.realpath(image + '.references.json')]);
    if (!target.startsWith(root + path.sep)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const snapshot = JSON.parse(await fs.readFile(target, 'utf8'));
    return NextResponse.json(snapshot);
  } catch { return NextResponse.json({ error: 'No saved reference record' }, { status: 404 }); }
}
