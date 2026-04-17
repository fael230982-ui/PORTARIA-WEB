import { NextResponse } from 'next/server.js';
import type { ReportPayload } from '../../../../types/report';
import { createReportRecord, getReportsStore, insertReport } from './store.ts';

export async function GET() {
  const reports = getReportsStore()
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    success: true,
    data: reports,
    total: reports.length,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<ReportPayload>;

  if (!payload.title || !String(payload.title).trim()) {
    return NextResponse.json(
      { success: false, message: 'O campo title e obrigatorio.' },
      { status: 400 }
    );
  }

  const report = createReportRecord({
    title: String(payload.title),
    description: String(payload.description ?? ''),
    category: String(payload.category ?? 'geral'),
    status: String(payload.status ?? 'ativo'),
    priority: String(payload.priority ?? 'normal'),
    visibility: String(payload.visibility ?? 'interno'),
    metadata: payload.metadata ?? null,
  });

  insertReport(report);

  return NextResponse.json({
    success: true,
    message: 'Relatorio criado com sucesso.',
    data: report,
  });
}
