import { retrieveSingleCall } from './openai';
import { AnalysisResult, SelectedParams, ProgressCallback } from '../types/pipeline';
import { generatePrompts } from './pipeline';

export type BatchResults = {
  prompt: string;
  responses: string[];
  metadata: {
    perspective: string;
    demographics: string[];
    context: string;
    questionType: string;
  };
};

export async function processBatch(
  prompts: string[], 
  params: SelectedParams, 
  batchSize: number = 3,
  onProgress?: ProgressCallback
): Promise<BatchResults[]> {
  const results: BatchResults[] = [];
  let completedPrompts = 0;

  for (const prompt of prompts) {
    const responses: string[] = [];
    
    onProgress?.({
      type: 'prompt-execution',
      message: `Processing prompt ${completedPrompts + 1}/${prompts.length}`,
      prompt,
      completedPrompts,
      totalPrompts: prompts.length
    });
    
    // Run multiple iterations for each prompt
    for (let i = 0; i < batchSize; i++) {
      try {
        onProgress?.({
          type: 'iteration-complete',
          message: `Running iteration ${i + 1}/${batchSize}`,
          prompt,
          iteration: i + 1,
          completedPrompts,
          totalPrompts: prompts.length
        });

        const response = await retrieveSingleCall(prompt, params.model);
        if (response) {
          responses.push(response);
        }
      } catch (error) {
        console.log(`Batch ${i} failed for prompt:`, prompt, error);
      }
    }

    completedPrompts++;
    console.log("RESPONSES_FOR_PROMPT", prompt, responses);

    // Extract metadata from the prompt
    const perspective = prompt.includes("I am") ? "First" : 
                       prompt.includes("My friend") ? "Third" : "Hypothetical";

    results.push({
      prompt,
      responses,
      metadata: {
        perspective,
        demographics: [
          ...params.demographics.genders,
          ...params.demographics.ages,
          ...params.demographics.ethnicities,
          ...params.demographics.socioeconomic
        ],
        context: params.context,
        questionType: params.questionTypes.find(qt => prompt.includes(qt)) || "Unknown"
      }
    });
  }

  return results;
}

export async function runAnalysisPipeline(
  params: SelectedParams, 
  // batchSize: number = params.iterations,
  onProgress?: ProgressCallback
): Promise<AnalysisResult> {
  // Generate prompts
  onProgress?.({
    type: 'prompt-generation',
    message: 'Generating prompts...'
  });
  
  const prompts = generatePrompts(params);

  onProgress?.({
    type: 'prompt-generation',
    message: `Generated ${prompts.length} prompts, running ${params.iterations} iterations each`,
    totalPrompts: prompts.length
  });
  
  // Process prompts in batches
  const batchResults = await processBatch(prompts, params, params.iterations, onProgress);
  
  // Create analysis result
  const result: AnalysisResult = {
    id: crypto.randomUUID(),
    modelName: params.model,
    concept: params.primaryIssues.join(', '),
    demographics: [
      ...params.demographics.genders,
      ...params.demographics.ages,
      ...params.demographics.ethnicities,
      ...params.demographics.socioeconomic
    ],
    context: params.context,
    details: `Analyzed ${prompts.length} prompts with ${params.iterations} iterations each.`,
    timestamp: new Date().toISOString(),
    prompts: batchResults.map(r => ({
      text: r.prompt,
      responses: r.responses,
      metadata: r.metadata
    }))
  };

  return result;
} 