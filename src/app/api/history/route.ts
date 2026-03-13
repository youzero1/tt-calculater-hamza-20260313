import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/datasource';
import { CalculationHistory } from '@/lib/entities/CalculationHistory';

export async function GET() {
  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(CalculationHistory);
    const records = await repo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return NextResponse.json({ history: records });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expression, result } = body as { expression: string; result: string };

    if (!expression || result === undefined) {
      return NextResponse.json({ error: 'expression and result are required' }, { status: 400 });
    }

    const ds = await getDataSource();
    const repo = ds.getRepository(CalculationHistory);

    const record = repo.create({ expression, result });
    await repo.save(record);

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    console.error('Error saving history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}
