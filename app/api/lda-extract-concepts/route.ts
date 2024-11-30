import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { AnalysisResult, LDAResult } from '@/app/types/pipeline';

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const results: AnalysisResult[] = await req.json();
        
        // Extract all responses from the results
        const responses: string[] = [];
        results.forEach(result => {
          result.prompts.forEach(prompt => {
            responses.push(...prompt.responses);
          });
        });

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'extraction_progress',
              message: 'Starting LDA concept extraction',
              progress: { processed: 0, total: responses.length }
            })}\n\n`
          )
        );

        // Run Python script
        const pythonScript = path.join(process.cwd(), 'app', 'python', 'lda_extractor.py');
        const pythonProcess = spawn('python', [pythonScript]);

        // Send the responses to the Python script
        pythonProcess.stdin.write(JSON.stringify(responses));
        pythonProcess.stdin.end();

        let outputData = '';

        pythonProcess.stdout.on('data', (data) => {
          outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`Python Error: ${data}`);
          // Only send actual errors, not debug info
          if (data.toString().toLowerCase().includes('error')) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error: data.toString()
                })}\n\n`
              )
            );
          }
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const ldaResults = JSON.parse(outputData) as LDAResult;
              
              if (ldaResults.error) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'error',
                      error: ldaResults.error
                    })}\n\n`
                  )
                );
              } else {
                // Send the extracted concepts
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'lda_concepts',
                      topics: ldaResults.topics,
                      distributions: ldaResults.doc_topic_distributions,
                      progress: { processed: responses.length, total: responses.length }
                    })}\n\n`
                  )
                );
              }

              // Send completion message
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'complete',
                    message: 'LDA concept extraction completed'
                  })}\n\n`
                )
              );
            } catch {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: 'Failed to parse Python output'
                  })}\n\n`
                )
              );
            }
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error: `Python process exited with code ${code}`
                })}\n\n`
              )
            );
          }
          controller.close();
        });

      } catch (error) {
        console.error('Concept extraction failed:', error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`
          )
        );
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 