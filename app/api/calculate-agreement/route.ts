import { NextResponse } from 'next/server';
import { AgreementScores } from '@/app/types/pipeline';
import { spawn } from 'child_process';
import { join } from 'path';

interface AllResults {
  analysisResults: Array<{
    id: string;
    modelName: string;
    concept: string;
    demographics: string[];
    context: string;
    details: string;
    timestamp: string;
    prompts: Array<{
      text: string;
      responses: string[];
      metadata: {
        perspective: string;
        demographics: string[];
        context: string;
        questionType: string;
      };
    }>;
  }>;
  conceptResults: {
    llm: {
      concepts: [string, number][];
      raceDistributions: [string, Record<string, number>][];
      clusters: Array<{
        id: number;
        concepts: string[];
        frequency: number[];
      }>;
    };
    lda: {
      topics: Array<{
        topic_id: number;
        words: string[];
        weights: number[];
      }>;
      distributions: number[][];
    };
    embeddings: Array<{
      cluster_id: number;
      size: number;
      representative_responses: string[];
      distribution: Record<string, number>;
    }>;
  };
}

async function runPythonScript(data: AllResults): Promise<AgreementScores> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      join(process.cwd(), 'new_agreement_score.py')
    ]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${error}`));
        return;
      }
      try {
        const parsedResult = JSON.parse(result);
        resolve(parsedResult);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${e}`));
      }
    });

    const serializedData = {
      analysisResults: data.analysisResults,
      conceptResults: {
        llm: {
          ...data.conceptResults.llm,
          raceDistributions: data.conceptResults.llm.raceDistributions.map(
            ([race, dist]) => [race, dist instanceof Map ? Object.fromEntries(dist) : dist]
          )
        },
        lda: data.conceptResults.lda,
        embeddings: data.conceptResults.embeddings
      }
    };

    pythonProcess.stdin.write(JSON.stringify(serializedData));
    pythonProcess.stdin.end();
  });
}

export async function POST(req: Request) {
  try {
    const data = await req.json() as AllResults;
    const agreementResults = await runPythonScript(data);
    return NextResponse.json(agreementResults);
  } catch (error) {
    console.error('Error calculating agreement scores:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate agreement scores', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 