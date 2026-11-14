import { NextResponse } from 'next/server';
import { callTool, getRateLimitStatus, getSafeToken } from '@/lib/mcp';
import { appendCRMNote, getCRMData } from '@/lib/data-store';
import { CRMNote } from '@/types/crm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = getCRMData();
  return NextResponse.json({
    success: true,
    notes: data.notes,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, account, kind = 'note', title } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Note text is required.',
      }, { status: 400 });
    }

    const validKinds = ['note', 'task', 'risk', 'next_step'];
    if (!validKinds.includes(kind)) {
      return NextResponse.json({
        success: false,
        error: `Invalid kind: ${kind}. Must be one of ${validKinds.join(', ')}.`,
      }, { status: 400 });
    }

    const token = getSafeToken();
    let mcpResult = null;

    if (token) {
      const rateCheck = getRateLimitStatus();
      if (rateCheck.canCallNow) {
        // Send write_note to Questathon MCP
        mcpResult = await callTool('write_note', {
          text,
          account: account || undefined,
          kind,
          title: title || undefined,
        });
      } else {
        // Note: if rate limited on MCP, we still save locally with status pending remote push
        console.warn(`Rate limit in effect for write_note (${rateCheck.secondsRemaining}s remaining). Saving locally.`);
      }
    }

    const newNote: CRMNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      accountId: account || 'All Accounts',
      kind,
      title: title || (kind.toUpperCase() + ': ' + text.slice(0, 30)),
      text,
      createdAt: new Date().toISOString(),
      author: 'Account Manager (You)',
    };

    appendCRMNote(newNote);

    return NextResponse.json({
      success: true,
      note: newNote,
      mcpStatus: mcpResult ? (mcpResult.success ? 'synced' : 'mcp_error') : 'saved_locally',
      mcpError: mcpResult?.error,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
