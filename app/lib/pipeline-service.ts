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
  const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB limit per response

  for (const prompt of prompts) {
    const responses: string[] = [];
    
    onProgress?.({
      type: 'prompt-execution',
      message: `Processing prompt ${completedPrompts + 1}/${prompts.length}`,
      prompt: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''), // Truncate long prompts in progress updates
      completedPrompts,
      totalPrompts: prompts.length
    });
    
    for (let i = 0; i < batchSize; i++) {
      try {
        const response = await retrieveSingleCall(prompt, params.model);
        if (response && response.length < MAX_RESPONSE_SIZE) {
          // Sanitize response to ensure it's valid JSON when stringified
          const sanitizedResponse = response
            .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .trim();
          responses.push(sanitizedResponse);
        } else {
          console.warn('Response exceeded size limit or was empty');
          responses.push('Response too large or empty');
        }
      } catch (error) {
        console.error(`Batch ${i} failed for prompt:`, prompt, error);
        responses.push('Failed to get response');
      }
    }

    completedPrompts++;

    // Create a safe version of the metadata
    const safeMetadata = {
      perspective: prompt.includes("I am") ? "First" : 
                  prompt.includes("My friend") ? "Third" : "Hypothetical",
      demographics: [
        ...params.demographics.genders,
        ...params.demographics.ages,
        ...params.demographics.ethnicities,
        ...params.demographics.socioeconomic
      ].map(d => d.slice(0, 100)), // Limit length of demographic strings
      context: params.context.slice(0, 1000), // Limit context length
      questionType: params.questionTypes.find(qt => prompt.includes(qt)) || "Unknown"
    };

    results.push({
      prompt: prompt.slice(0, 1000), // Limit prompt length
      responses,
      metadata: safeMetadata
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