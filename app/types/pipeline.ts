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

export type LDATopicResult = {
  topic_id: number;
  words: string[];
  weights: number[];
};

export type LDAResult = {
  topics: LDATopicResult[];
  doc_topic_distributions: number[][];
  error?: string;
};

export type ConceptExtractionType = 'llm' | 'lda';

export type ExtractedConcepts = {
  concepts: string[];
  race?: string;
  response: string;
};

export type LDAExtractedConcepts = {
  topics: LDATopicResult[];
  distributions: number[][];
};

export interface ClusterConcept {
  cluster_id: number;
  size: number;
  representative_responses: string[];
  distribution: { [race: string]: number };
}

export interface EmbeddingsResults {
  clusters: ClusterConcept[];
  distributions: number[][];
}

export interface ExtractionProgress {
  processed: number;
  total: number;
  message: string;
  type: 'llm' | 'lda' | 'embeddings';
}

export type EmbeddingsResult = {
  cluster_id: number;
  size: number;
  representative_responses: string[];
  distribution: { [key: string]: number };
}; 