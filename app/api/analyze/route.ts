import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisPipeline } from '@/app/lib/pipeline-service';
import { SelectedParams } from '@/app/types/pipeline';

export async function POST(request: NextRequest) {
  try {
    const params = await request.json() as SelectedParams;
    
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the response stream
    const response = new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Run analysis pipeline with progress updates
    runAnalysisPipeline(params, 1, async (update) => {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
      );
    }).then(async (result) => {
      // Send the final result
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`)
      );
      await writer.close();
    }).catch(async (error) => {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
      );
      await writer.close();
    });

    return response;
  } catch (error) {
    console.log('Analysis pipeline error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 