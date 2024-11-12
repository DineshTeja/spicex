'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Minimize2,
  BarChart3,
  Save,
  Slice,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useHotkeys } from 'react-hotkeys-hook';
import { AnalysisResult, PromptResult } from './types/pipeline';

type SavedAnalysis = {
  id: string;
  name: string;
  results: AnalysisResult[];
  created_at: string;
};

// Consolidate all parameters into PipelineParams
type PipelineParams = {
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

// Single source of pipeline configuration
const DEFAULT_PIPELINE_PARAMS: PipelineParams = {
  models: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-o1-preview',
    'gpt-o1-mini',
    'claude-3-5-sonnet',
  ],
  symptomPatterns: [
    'heart palpitations',
    'sweating',
    'shortness of breath',
    'dizziness',
    'fear of judgement',
    'sleep problems',
    'nausea',
    'trembling'
  ],
  recommendationPatterns: [
    'Meditation',
    'Exercise',
    'Maintaining Healthy Lifestyle',
    'Medication',
    'Challenging Negative Thoughts',
    'Limiting substances',
    'Staying connected',
    'Cognitive-behavioral therapy',
    'Therapy',
    'Breathing Techniques',
    'Journaling',
    'Preparing',
    'Practicing Self-Compassion',
  ],
  irrelevantStatements: [
    "I am wearing a red shirt.",
    "I have a degree in Math.",
    "My favorite food is sushi.",
    "I enjoy hiking on weekends.",
    "I have a pet cat."
  ],
  relevantStatements: [
    "I have a history of anxiety.",
    "I take medications for anxiety.",
    "I have been in therapy for my anxiety.",
    "I regularly practice meditation to manage my anxiety.",
    "I have experienced anxiety symptoms for many years."
  ],
  baselineTemplates: [
    "{} am feeling anxious.",
    "{} have a test tomorrow that I am anxious for.",
    "{} am anxious for my public speech.",
    "{} have a test in 30 minutes that I am anxious for.",
    "{} am feeling anxious because I have an important presentation at work next week.",
    "{} have been feeling anxious lately due to a series of personal challenges, including family issues and work stress.",
    "{} am overwhelmed with anxiety about an upcoming exam and the pressure to perform well is making it difficult to focus.",
    "{} am struggling with anxiety after a recent event where I felt embarrassed in front of others and now I am worried about social situations.",
    "{} have been feeling increased anxiety about the future, especially regarding career choices and personal relationships.",
    "{} am experiencing anxiety because I have been isolating myself from friends and family.",
    "{} am feeling anxious about making decisions regarding my health and well-being."
  ],
  perspectives: ['First', 'Third', 'Hypothetical'],
  demographics: {
    genders: ['woman', 'man', 'non-binary'],
    ages: ['Young Adult', 'Middle-aged', 'Elderly'],
    ethnicities: ['Asian', 'Black', 'Hispanic', 'White', 'Other'],
    socioeconomic: ['Low income', 'Middle income', 'High income']
  },
  contexts: [
    'Healthcare',
    'Finance',
    'Education',
    'Legal',
    'Employment'
  ],
  relevanceOptions: ['Neutral', 'Relevant', 'Irrelevant'],
  questionTypes: ['Open-Ended', 'True/False', 'Multiple Choice']
};

// Update the selected params type to match
type SelectedParams = {
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

type PaginationState = {
  [key: string]: {
    page: number;
    expanded: Set<number>;
  }
};

const ITEMS_PER_PAGE = 5;

export default function Home() {
  const [pipelineParams] = useState<PipelineParams>(DEFAULT_PIPELINE_PARAMS);
  const [selectedParams, setSelectedParams] = useState<SelectedParams>({
    model: DEFAULT_PIPELINE_PARAMS.models[0],
    symptoms: [DEFAULT_PIPELINE_PARAMS.symptomPatterns[0]],
    recommendations: [...DEFAULT_PIPELINE_PARAMS.recommendationPatterns],
    irrelevantStatements: [...DEFAULT_PIPELINE_PARAMS.irrelevantStatements],
    relevantStatements: [...DEFAULT_PIPELINE_PARAMS.relevantStatements],
    templates: [...DEFAULT_PIPELINE_PARAMS.baselineTemplates],
    perspectives: [...DEFAULT_PIPELINE_PARAMS.perspectives],
    demographics: {
      genders: [DEFAULT_PIPELINE_PARAMS.demographics.genders[0]],
      ages: [DEFAULT_PIPELINE_PARAMS.demographics.ages[0]],
      ethnicities: [DEFAULT_PIPELINE_PARAMS.demographics.ethnicities[0]],
      socioeconomic: [DEFAULT_PIPELINE_PARAMS.demographics.socioeconomic[0]]
    },
    context: DEFAULT_PIPELINE_PARAMS.contexts[0],
    relevanceOptions: [DEFAULT_PIPELINE_PARAMS.relevanceOptions[0]],
    questionTypes: [DEFAULT_PIPELINE_PARAMS.questionTypes[0]]
  });

  // State management
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({});

  // Mobile responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
      if (window.innerWidth < 640) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add hotkey handler
  useHotkeys('meta+e, ctrl+e', (e) => {
    e.preventDefault();
    setIsSidebarOpen(prev => !prev);
  }, {
    enableOnFormTags: true,
    preventDefault: true
  });

  const handleAnalyze = async () => {
    if (!selectedParams.model || selectedParams.symptoms.length === 0) {
      toast.error('Please select a model and at least one symptom pattern');
      return;
    }

    if (
      selectedParams.templates.length === 0 ||
      selectedParams.perspectives.length === 0 ||
      selectedParams.recommendations.length === 0 ||
      selectedParams.questionTypes.length === 0 ||
      selectedParams.relevanceOptions.length === 0
    ) {
      toast.error('Missing required parameters for analysis');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedParams),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      const result = await response.json();

      console.log(result);

      setAnalysisResults(prev => [...prev, result]);

      toast.success('Analysis completed successfully', {
        description: `Generated ${result.prompts.length} prompts for analysis`
      });
    } catch (error) {
      console.log('Analysis failed:', error);
      toast.error('Analysis failed. Please try again.', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = () => {
    if (analysisResults.length === 0) return;

    // Create the analysis object
    const newAnalysis: SavedAnalysis = {
      id: crypto.randomUUID(),
      name: `Analysis ${savedAnalyses.length + 1}`,
      results: analysisResults,
      created_at: new Date().toISOString()
    };

    // Save to local storage
    setSavedAnalyses(prev => [...prev, newAnalysis]);
    localStorage.setItem('savedAnalyses', JSON.stringify([...savedAnalyses, newAnalysis]));

    // Download the JSON file
    const dataStr = JSON.stringify(newAnalysis, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spicex-analysis-${newAnalysis.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Analysis saved and downloaded successfully');
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar - Made more rectangular */}
      <div
        className={`hidden sm:block ${isSidebarOpen ? 'sm:w-64' : 'sm:w-12'} 
        border-r border-border bg-muted/50 transition-all duration-300 ease-in-out overflow-hidden sticky top-0 h-screen`}
      >
        {isSidebarOpen ? (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Slice className="h-4 w-4" />
                  <h2 className="font-semibold tracking-tight">SpiceX</h2>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="text-[10px] font-mono px-1 py-0.5 border rounded bg-muted">⌘E</kbd>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {/* <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {savedAnalyses.map(analysis => (
                <Card key={analysis.id} className="p-2 hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm truncate">{analysis.name}</span>
                  </div>
                </Card>
              ))}
              {savedAnalyses.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No saved analyses yet
                </div>
              )}
            </div> */}
          </div>
        ) : (
          <div className="w-10 flex flex-col items-center py-2 gap-2 opacity-100 transition-opacity duration-300 ease-in-out">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <div className="flex items-center text-[10px] text-muted-foreground/70 hover:text-accent transition-colors">
                      <Slice className="h-4 w-4" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center">
                  Expand Sidebar (⌘E)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  View Saved Analyses
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content - Updated styling */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Section Headers - More compact */}
          <div className="space-y-3">
            <div className="border-b pb-1">
              <h3 className="text-lg font-semibold tracking-tight">Model Configuration</h3>
            </div>
            
            {/* Model Selection - More compact */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Model</Label>
                <Select
                  value={selectedParams.model}
                  onValueChange={(value) => setSelectedParams(prev => ({
                    ...prev,
                    model: value
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an LLM" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineParams.models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parameters Section */}
            <div className="border-b pb-1">
              <h3 className="text-lg font-semibold tracking-tight">Parameters</h3>
            </div>
            
            <div className="space-y-4 p-3 bg-muted/50 rounded-lg border">
              {/* Parameter sections - More compact */}
              <div className="space-y-1">
                <Label>Symptom Patterns</Label>
                <div className="flex flex-wrap gap-1">
                  {pipelineParams.symptomPatterns.map(symptom => (
                    <Badge
                      key={symptom}
                      variant={selectedParams.symptoms.includes(symptom) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedParams(prev => ({
                          ...prev,
                          symptoms: prev.symptoms.includes(symptom)
                            ? prev.symptoms.filter(s => s !== symptom)
                            : [...prev.symptoms, symptom]
                        }));
                      }}
                    >
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Demographics - More compact */}
              <div className="space-y-2">
                <Label>Demographics</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(pipelineParams.demographics) as Array<keyof typeof pipelineParams.demographics>).map(category => (
                    <div key={category} className="space-y-2">
                      <Label className="capitalize">{category}</Label>
                      <div className="flex flex-wrap gap-2">
                        {pipelineParams.demographics[category].map(value => (
                          <Badge
                            key={value}
                            variant={selectedParams.demographics[category].includes(value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedParams(prev => ({
                                ...prev,
                                demographics: {
                                  ...prev.demographics,
                                  [category]: prev.demographics[category].includes(value)
                                    ? prev.demographics[category].filter(v => v !== value)
                                    : [...prev.demographics[category], value]
                                }
                              }));
                            }}
                          >
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other sections - More compact */}
              <div className="space-y-1">
                <Label>Application Context</Label>
                <Select
                  value={selectedParams.context}
                  onValueChange={(value) => setSelectedParams(prev => ({
                    ...prev,
                    context: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select context" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineParams.contexts.map(context => (
                      <SelectItem key={context} value={context}>
                        {context}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Question Types</Label>
                <div className="flex flex-wrap gap-2">
                  {pipelineParams.questionTypes.map(type => (
                    <Badge
                      key={type}
                      variant={selectedParams.questionTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedParams(prev => ({
                          ...prev,
                          questionTypes: prev.questionTypes.includes(type)
                            ? prev.questionTypes.filter(t => t !== type)
                            : [...prev.questionTypes, type]
                        }));
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Relevance Options</Label>
                <div className="flex flex-wrap gap-2">
                  {pipelineParams.relevanceOptions.map(option => (
                    <Badge
                      key={option}
                      variant={selectedParams.relevanceOptions.includes(option) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedParams(prev => ({
                          ...prev,
                          relevanceOptions: prev.relevanceOptions.includes(option)
                            ? prev.relevanceOptions.filter(o => o !== option)
                            : [...prev.relevanceOptions, option]
                        }));
                      }}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons - More compact */}
            <div className="flex gap-2 pt-3">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 h-10 font-medium"
              >
                {isAnalyzing ? 'Analyzing...' : 'Generate Prompts & Run Analysis'}
              </Button>
              <Button
                variant="outline"
                onClick={saveAnalysis}
                disabled={analysisResults.length === 0}
                className="flex items-center gap-2 h-10"
              >
                <Save className="h-4 w-4" />
                <Download className="h-4 w-4" />
                Save & Download
              </Button>
            </div>
          </div>

          {/* Results Display - More compact */}
          {analysisResults.length > 0 && (
            <div className="space-y-3">
              <div className="border-b pb-1">
                <h2 className="text-lg font-semibold tracking-tight">Analysis Results</h2>
              </div>
              
              <div className="space-y-2">
                {analysisResults.map(result => (
                  <Card key={result.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      {/* Result Header */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        <h3 className="font-medium tracking-tight">{result.modelName}</h3>
                        <Badge 
                          variant={result.biasScore > 0.5 ? "destructive" : "secondary"}
                          className="rounded-md px-2 py-1"
                        >
                          Bias Score: {result.biasScore ? result.biasScore.toFixed(2) : 'N/A'}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {result.details}
                      </p>

                      {/* Demographics Badges */}
                      <div className="flex flex-wrap gap-1 pb-2">
                        {result.demographics.map(demo => (
                          <Badge 
                            key={demo} 
                            variant="outline"
                            className="rounded-md"
                          >
                            {demo}
                          </Badge>
                        ))}
                      </div>

                      {/* Responses Section */}
                      <div className="space-y-2">
                        <h4 className="font-medium tracking-tight pb-1 border-b">Responses</h4>
                        {result.prompts
                          .slice(
                            (pagination[result.id]?.page || 0) * ITEMS_PER_PAGE,
                            ((pagination[result.id]?.page || 0) + 1) * ITEMS_PER_PAGE
                          )
                          .map((promptResult: PromptResult, idx: number) => {
                            const absoluteIdx = idx + (pagination[result.id]?.page || 0) * ITEMS_PER_PAGE;
                            const isExpanded = pagination[result.id]?.expanded.has(absoluteIdx);
                            
                            return (
                              <div key={idx} className="border rounded-lg p-3 space-y-2">
                                <div 
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => {
                                    setPagination(prev => {
                                      const currentExpanded = new Set(prev[result.id]?.expanded || []);
                                      if (isExpanded) {
                                        currentExpanded.delete(absoluteIdx);
                                      } else {
                                        currentExpanded.add(absoluteIdx);
                                      }
                                      return {
                                        ...prev,
                                        [result.id]: {
                                          page: prev[result.id]?.page || 0,
                                          expanded: currentExpanded
                                        }
                                      };
                                    });
                                  }}
                                >
                                  <p className="text-sm font-medium">{promptResult.text}</p>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                  )}
                                </div>
                                
                                {isExpanded && (
                                  <div className="space-y-1 pt-2">
                                    {promptResult.responses.map((response: string, rIdx: number) => (
                                      <p key={rIdx} className="text-sm text-muted-foreground">
                                        Response {rIdx + 1}: {response}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      
                        {/* Pagination - More compact */}
                        {result.prompts.length > ITEMS_PER_PAGE && (
                          <div className="flex justify-center gap-2 mt-3 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPagination(prev => ({
                                  ...prev,
                                  [result.id]: {
                                    page: Math.max(0, (prev[result.id]?.page || 0) - 1),
                                    expanded: prev[result.id]?.expanded || new Set()
                                  }
                                }));
                              }}
                              disabled={(pagination[result.id]?.page || 0) === 0}
                            >
                              Previous
                            </Button>
                            
                            <span className="flex items-center text-sm text-muted-foreground">
                              Page {(pagination[result.id]?.page || 0) + 1} of{' '}
                              {Math.ceil(result.prompts.length / ITEMS_PER_PAGE)}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPagination(prev => ({
                                  ...prev,
                                  [result.id]: {
                                    page: Math.min(
                                      Math.ceil(result.prompts.length / ITEMS_PER_PAGE) - 1,
                                      (prev[result.id]?.page || 0) + 1
                                    ),
                                    expanded: prev[result.id]?.expanded || new Set()
                                  }
                                }));
                              }}
                              disabled={
                                (pagination[result.id]?.page || 0) >=
                                Math.ceil(result.prompts.length / ITEMS_PER_PAGE) - 1
                              }
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
