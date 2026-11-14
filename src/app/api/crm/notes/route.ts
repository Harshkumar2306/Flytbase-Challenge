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
    let mcpResult: any = null;
    let syncState: 'synced' | 'saved_locally_pending' = 'saved_locally_pending';

    if (token) {
      const rateCheck = getRateLimitStatus();
      if (rateCheck.canCallNow) {
        // Dispatch write_note to Questathon MCP
        mcpResult = await callTool('write_note', {
          text: text.trim(),
          account: account || undefined,
          kind,
          title: title ? title.trim() : undefined,
        });

        if (mcpResult.success) {
          syncState = 'synced';
        }
      }
    }

    // Stable note identifier
    const noteId = `note_${Date.now()}_${Buffer.from(text.trim()).toString('hex').slice(0, 8)}`;

    const newNote: CRMNote = {
      id: noteId,
      accountId: account || 'All Accounts',
      kind,
      title: title ? title.trim() : (kind.toUpperCase() + ': ' + text.slice(0, 30)),
      text: text.trim(),
      createdAt: new Date().toISOString(),
      author: 'Account Manager',
      syncStatus: syncState,
    };

    appendCRMNote(newNote);

    return NextResponse.json({
      success: true,
      note: newNote,
      mcpStatus: syncState,
      mcpError: mcpResult && !mcpResult.success ? mcpResult.error : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
