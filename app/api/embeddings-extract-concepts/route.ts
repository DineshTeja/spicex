import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { AnalysisResult } from '@/app/types/pipeline';

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const results: AnalysisResult[] = await req.json();
        
        // Extract all responses from the results
        const responses: { response: string; race: string }[] = [];
        results.forEach(result => {
          result.prompts.forEach(prompt => {
            prompt.responses.forEach(response => {
              responses.push({
                response,
                race: result.demographics.find(d => 
                  ['Asian', 'African', 'Caucasian', 'Hispanic'].includes(d)
                ) || 'Unknown'
              });
            });
          });
        });

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'extraction_progress',
              message: 'Starting embeddings concept extraction',
              progress: { processed: 0, total: responses.length }
            })}\n\n`
          )
        );

        // Run Python script
        const pythonScript = path.join(process.cwd(), 'app', 'python', 'embeddings_extractor.py');
        const pythonProcess = spawn('python', [pythonScript]);

        // Send the responses to the Python script
        pythonProcess.stdin.write(JSON.stringify(responses));
        pythonProcess.stdin.end();

        const outputData = '';

        pythonProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const parsedData = JSON.parse(line);
              
              if (parsedData.type === 'progress') {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'extraction_progress',
                      message: parsedData.message,
                      progress: parsedData.progress
                    })}\n\n`
                  )
                );
              } else if (parsedData.type === 'error') {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'error',
                      error: parsedData.error
                    })}\n\n`
                  )
                );
              } else {
                // This is the final cluster concepts data
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'embeddings_concepts',
                      cluster_concepts: parsedData
                    })}\n\n`
                  )
                );
              }
            } catch (error) {
              console.error('Error parsing Python output:', error);
            }
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`Python Error: ${data}`);
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
              const embeddingsResults = JSON.parse(outputData);
              
              // Send the cluster concepts
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'embeddings_concepts',
                    cluster_concepts: embeddingsResults,
                    progress: { processed: responses.length, total: responses.length }
                  })}\n\n`
                )
              );

              // Send completion message
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'complete',
                    message: 'Embeddings concept extraction completed'
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
        console.error('Embeddings extraction failed:', error);
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