export type PipelineParams = {
  models: string[];
  symptomPatterns: string[];
  recommendationPatterns: string[];
  irrelevantStatements: string[];
  relevantStatements: string[];
  baselineTemplates: string[];
  perspectives: string[];
  demographics: {
    genders: string[];
    ages: string[];
    ethnicities: string[];
    socioeconomic: string[];
  };
  contexts: string[];
  relevanceOptions: string[];
  questionTypes: string[];
};

export type SelectedParams = {
  model: string;
  symptoms: string[];
  recommendations: string[];
  irrelevantStatements: string[];
  relevantStatements: string[];
  templates: string[];
  perspectives: string[];
  demographics: {
    genders: string[];
    ages: string[];
    ethnicities: string[];
    socioeconomic: string[];
  };
  context: string;
  relevanceOptions: string[];
  questionTypes: string[];
};

export type PromptResult = {
  text: string;
  responses: string[];
  metadata: {
    perspective: string;
    demographics: string[];
    context: string;
    questionType: string;
  };
};

export type AnalysisResult = {
  id: string;
  modelName: string;
  concept: string;
  demographics: string[];
  context: string;
  biasScore: number;
  details: string;
  timestamp: string;
  prompts: PromptResult[];
};

export type ProgressUpdate = {
  type: 'prompt-generation' | 'prompt-execution' | 'iteration-complete';
  message: string;
  prompt?: string;
  iteration?: number;
  totalPrompts?: number;
  completedPrompts?: number;
}

export type ProgressCallback = (update: ProgressUpdate) => void; 