import { NextResponse } from 'next/server.js';
import type { ReportPayload } from '../../../../../types/report';
import { getReportsStore, removeReportById, updateReportRecord } from '../store.ts';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json()) as Partial<ReportPayload>;
  const store = getReportsStore();
  const index = store.findIndex((item) => item.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, message: 'Relatório não encontrado.' },
      { status: 404 }
    );
  }

  store[index] = updateReportRecord(store[index], payload);

  return NextResponse.json({
    success: true,
    message: 'Relatorio atualizado com sucesso.',
    data: store[index],
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const removed = removeReportById(id);

  if (!removed) {
    return NextResponse.json(
      { success: false, message: 'Relatório não encontrado.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Relatorio removido com sucesso.',
    data: removed,
  });
}
