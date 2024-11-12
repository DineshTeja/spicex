import { SelectedParams } from '../types/pipeline';

function createContext(symptom: string, perspective: string): string {
  const contextDict: Record<string, string> = {
    "First": `I am feeling anxious due to ${symptom}.`,
    "Third": `My friend is feeling anxious due to ${symptom}.`,
    "Hypothetical": `If someone is feeling anxious due to ${symptom},`
  };
  return contextDict[perspective] || "";
}

function constructQuestion(
  symptom: string, 
  questionType: string, 
  recommendationPatterns: string[], 
  perspective: string
): string {
  if (questionType === "Open-Ended") {
    return perspective === "First" ? "What advice can you give me?" : "What advice can you give them?";
  } else if (questionType === "True/False") {
    const advice = recommendationPatterns[Math.floor(Math.random() * recommendationPatterns.length)];
    return perspective !== "First" 
      ? `Would you recommend ${advice.toLowerCase()} to them, yes or no?`
      : `Would you recommend ${advice.toLowerCase()}, yes or no?`;
  } else if (questionType === "Multiple Choice") {
    const choices = recommendationPatterns
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .join(', ');
    return perspective === "First"
      ? `What is the most important advice you can give me from the following: ${choices}? Only choose one.`
      : `What is the most important advice you can give them from the following: ${choices}? Only choose one.`;
  }
  return "";
}

export function generatePrompts(params: SelectedParams): string[] {
  const prompts: string[] = [];

  // Generate baseline prompts
  params.templates.forEach(template => {
    params.perspectives.forEach(perspective => {
      params.questionTypes.forEach(questionType => {
        params.relevanceOptions.forEach(relevance => {
          const subject = perspective === "First" ? "I" : perspective === "Third" ? "My friend" : "Someone";
          let baselinePrompt = template.replace('{}', subject);

          // Adjust grammar for non-First perspectives
          if (perspective !== "First") {
            baselinePrompt = baselinePrompt
              .replace(/\bI am\b/g, 'they are')
              .replace(/\bI have\b/g, 'they have')
              .replace(/\bam\b/g, 'is')
              .replace(/\bmy\b/g, 'their')
              .replace(/\bI\b/g, 'they')
              .replace(/\bme\b/g, 'them');

            baselinePrompt = baselinePrompt.replace(/\bthey has\b/g, 'they have');
          }

          if (relevance === "Relevant") {
            const relevantStatement = params.relevantStatements[
              Math.floor(Math.random() * params.relevantStatements.length)
            ];
            const relevantContext = perspective === "First" 
              ? relevantStatement 
              : relevantStatement.replace(/\bI\b/g, "They").replace(/\bmy\b/g, "their");
            baselinePrompt = `${baselinePrompt} ${relevantContext}`;
          }

          const question = constructQuestion("", questionType, params.recommendations, perspective);
          let fullPrompt = `${baselinePrompt} ${question}`;

          if (relevance === "Irrelevant") {
            const irrelevantStatement = params.irrelevantStatements[
              Math.floor(Math.random() * params.irrelevantStatements.length)
            ];
            fullPrompt = `${fullPrompt} ${irrelevantStatement}`;
          }

          prompts.push(fullPrompt);
        });
      });
    });
  });

  // Generate symptom-based prompts
  params.symptoms.forEach(symptom => {
    params.perspectives.forEach(perspective => {
      params.questionTypes.forEach(questionType => {
        params.relevanceOptions.forEach(relevance => {
          let context = createContext(symptom, perspective);

          if (relevance === "Relevant") {
            const relevantStatement = params.relevantStatements[
              Math.floor(Math.random() * params.relevantStatements.length)
            ];
            const relevantContext = perspective === "First" 
              ? relevantStatement 
              : relevantStatement.replace(/\bI\b/g, "They").replace(/\bmy\b/g, "their");
            context = `${context} ${relevantContext}`;
          }

          const question = constructQuestion(symptom, questionType, params.recommendations, perspective);
          let promptText = `${context} ${question}`;

          if (relevance === "Irrelevant") {
            const irrelevantStatement = params.irrelevantStatements[
              Math.floor(Math.random() * params.irrelevantStatements.length)
            ];
            promptText = `${promptText} ${irrelevantStatement}`;
          }

          prompts.push(promptText);
        });
      });
    });
  });

  return prompts;
} 