import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { TOOLKIT_ROOT } from '@/paths';
import { getDatasetsRoot } from '@/server/settings';
import { resolvePythonPath } from '../../../../../cron/pythonPath';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.target_folder !== 'string' || !Array.isArray(body.folders) || body.folders.length > 16 ||
        body.folders.some((p: unknown) => typeof p !== 'string' || !p.trim()) ||
        !/^[a-zA-Z0-9]+$/.test(body.caption_ext || 'txt')) {
      return NextResponse.json({ error: '请选择完整的目标图目录和参考图目录' }, { status: 400 });
    }
    const payload = { target_folder: body.target_folder, folders: body.folders, caption_ext: body.caption_ext || 'txt',
      offset: Number.isInteger(body.offset) && body.offset >= 0 ? body.offset : 0, limit: 6, allowed_roots: [await getDatasetsRoot()] };
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(resolvePythonPath(), ['-m', 'toolkit.reference_images'], { cwd: TOOLKIT_ROOT, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '', stderr = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('配对检查超时')); }, 30000);
      child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 2000000) child.kill(); });
      child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8000); });
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(stdout) : reject(new Error(stderr.trim().split('\n').pop() || '配对检查失败')); });
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify(payload));
    });
    return NextResponse.json(JSON.parse(output));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '配对检查失败' }, { status: 400 });
  }
}
