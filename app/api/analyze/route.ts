import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisPipeline } from '@/app/lib/pipeline-service';
import { SelectedParams } from '@/app/types/pipeline';

export async function POST(request: NextRequest) {
  try {
    const params = await request.json() as SelectedParams;
    
    // Run the analysis pipeline
    const result = await runAnalysisPipeline(params, 3); // 3 iterations per prompt

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis pipeline error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 