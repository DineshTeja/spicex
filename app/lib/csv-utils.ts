import { AnalysisResult, ExtractedConcepts, LDATopicResult } from "@/app/types/pipeline";
import Papa from 'papaparse';

export interface ConceptExtractionRow {
  Category: string;
  Relevance: string; 
  Perspective: string;
  Question_Type: string;
  Prompt: string;
  Gender: string | null;
  Race: string;
  Response: string;
  GPT_Categories: string;
}

export interface LDAExtractionRow {
  Prompt: string;
  Response: string;
  Gender: string | null;
  Race: string;
  Dominant_Topic: number;
  Topic_Probability: number;
  Topic_Keywords: string;
  Topic_Description: string;
  Topic_Distribution?: string;
}

export interface EmbeddingsExtractionRow {
  Prompt: string;
  Response: string;
  processed_response: string;
  pca_one: number;
  pca_two: number;
  cluster: number;
  pca_cluster_number: string;
  raw_embeddings: number[];
}

export function createConceptExtractionCSV(
  analysisResults: AnalysisResult[],
  extractedConcepts: ExtractedConcepts[]
): string {
  // Create rows array to hold all data
  const rows: ConceptExtractionRow[] = [];

  // Map through analysis results to create base rows
  analysisResults.forEach(result => {
    result.prompts.forEach(prompt => {
      // Extract gender from demographics metadata
      const gender = prompt.metadata.demographics.find(d => 
        ['woman', 'man', 'non-binary'].includes(d)
      ) || null;

      prompt.responses.forEach(response => {
        // Find matching extracted concepts for this response
        const matchingConcepts = extractedConcepts.find(
          ec => ec.response === response.replace(/[\n\r]+/g, ' ').trim()
        );

        if (matchingConcepts) {
          rows.push({
            Category: "Anxiety Management",
            Relevance: "Neutral", //TODO:replace with prompt.metadata.relevance
            Perspective: prompt.metadata.perspective || "First",
            Question_Type: "Open-Ended",
            Prompt: prompt.text,
            Gender: gender,
            Race: matchingConcepts.race || "Unknown",
            Response: response,
            GPT_Categories: JSON.stringify(matchingConcepts.concepts)
          });
        }
      });
    });
  });

  // Use Papa Parse to convert to CSV
  const csv = Papa.unparse(rows, {
    quotes: true,
    delimiter: ",",
    header: true
  });

  return csv;
}

export function createLDAExtractionCSV(
  analysisResults: AnalysisResult[],
  ldaResults: {
    topics: LDATopicResult[];
    distributions: number[][];
  }
): string {
  const rows: LDAExtractionRow[] = [];
  let responseIndex = 0;

  analysisResults.forEach(result => {
    result.prompts.forEach(prompt => {
      const gender = prompt.metadata.demographics.find(d => 
        ['woman', 'man', 'non-binary'].includes(d)
      ) || null;
      
      const race = prompt.metadata.demographics.find(d => 
        ['Asian', 'Black', 'Hispanic', 'White'].includes(d)
      ) || 'Unknown';

      prompt.responses.forEach(response => {
        // Get topic distribution for this response
        const topicDistribution = ldaResults.distributions[responseIndex];
        if (!topicDistribution) return;

        // Find dominant topic and its probability
        const dominantTopicIndex = topicDistribution.indexOf(Math.max(...topicDistribution));
        const dominantTopic = ldaResults.topics[dominantTopicIndex];
        const topicProbability = topicDistribution[dominantTopicIndex];
        
        // Create topic description with all probabilities
        const topKeywords = dominantTopic.words.slice(0, 5).join(', ');
        const topicDescription = ldaResults.topics.map((topic, idx) => 
          `Topic ${topic.topic_id} (${topicDistribution[idx].toFixed(3)})`
        ).join('; ');

        rows.push({
          Prompt: prompt.text,
          Response: response,
          Gender: gender,
          Race: race,
          Dominant_Topic: dominantTopic.topic_id,
          Topic_Probability: topicProbability,
          Topic_Keywords: topKeywords,
          Topic_Description: topicDescription
        });

        responseIndex++;
      });
    });
  });

  // Use Papa Parse to convert to CSV
  const csv = Papa.unparse(rows, {
    quotes: true,
    delimiter: ",",
    header: true
  });

  return csv;
}

export function createEmbeddingsExtractionCSV(
  analysisResults: AnalysisResult[],
  embeddingsResults: {
    cluster_id: number;
    representative_responses: string[];
    coordinates: number[][];
    embeddings: number[][];
  }[]
): string {
  const rows: EmbeddingsExtractionRow[] = [];

  analysisResults.forEach(result => {
    result.prompts.forEach(prompt => {
      prompt.responses.forEach(response => {
        const cluster = embeddingsResults.find(c => 
          c.representative_responses.some(rep => 
            rep.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase() === 
            response.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase()
          )
        );
        
        if (cluster) {
          const responseIdx = cluster.representative_responses.findIndex(rep =>
            rep.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase() === 
            response.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase()
          );

          if (responseIdx !== -1) {
            const coordinates = cluster.coordinates[responseIdx];
            const embeddings = cluster.embeddings[responseIdx];

            rows.push({
              Prompt: prompt.text,
              Response: response,
              processed_response: response.toLowerCase().replace(/[^\w\s]/g, ''),
              pca_one: coordinates[0],
              pca_two: coordinates[1],
              cluster: Math.round(cluster.cluster_id),
              pca_cluster_number: `Cluster ${cluster.cluster_id + 1}`,
              raw_embeddings: embeddings
            });
          }
        }
      });
    });
  });

  return Papa.unparse(rows, {
    quotes: true,
    delimiter: ",",
    header: true
  });
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createMergedAnalysisCSV(
  analysisResults: AnalysisResult[],
  extractedConcepts: ExtractedConcepts[],
  ldaResults: {
    topics: LDATopicResult[];
    distributions: number[][];
  },
  embeddingsResults: {
    cluster_id: number;
    representative_responses: string[];
    coordinates: number[][];
    embeddings: number[][];
    size: number;
    distribution: { [key: string]: number };
  }[]
): string {
  // Create individual dataframes
  const llmRows: ConceptExtractionRow[] = [];
  const ldaRows: LDAExtractionRow[] = [];
  const embeddingsRows: EmbeddingsExtractionRow[] = [];

  // Process each response once and create all rows
  let responseIndex = 0;
  analysisResults.forEach(result => {
    result.prompts.forEach(prompt => {
      const gender = prompt.metadata.demographics.find(d => 
        ['woman', 'man', 'non-binary'].includes(d)
      ) || null;
      
      const race = prompt.metadata.demographics.find(d => 
        ['Asian', 'Black', 'Hispanic', 'White'].includes(d)
      ) || 'Unknown';

      prompt.responses.forEach((response) => {
        // Clean response text for consistency
        const cleanResponse = response.replace(/[\n\r]+/g, ' ').trim();

        // 1. LLM Concepts
        const matchingConcepts = extractedConcepts.find(
          ec => ec.response === cleanResponse
        );

        if (matchingConcepts) {
          llmRows.push({
            Category: "Anxiety Management",
            Relevance: "Neutral",
            Perspective: prompt.metadata.perspective || "First",
            Question_Type: "Open-Ended",
            Prompt: prompt.text,
            Gender: gender,
            Race: race,
            Response: cleanResponse,
            GPT_Categories: JSON.stringify(matchingConcepts.concepts)
          });
        }

        // 2. LDA Topics
        const topicDistribution = ldaResults.distributions[responseIndex];
        if (topicDistribution) {
          // Find dominant topic and its probability
          const dominantTopicIndex = topicDistribution.indexOf(Math.max(...topicDistribution));
          const dominantTopic = ldaResults.topics[dominantTopicIndex];
          const topicProbability = topicDistribution[dominantTopicIndex];

          // Get all topic probabilities for this response
          const allTopicProbabilities = ldaResults.topics.map((topic, idx) => ({
            topic_id: topic.topic_id,
            probability: topicDistribution[idx]
          }));

          ldaRows.push({
            Prompt: prompt.text,
            Response: cleanResponse,
            Gender: gender,
            Race: race,
            Dominant_Topic: dominantTopic.topic_id,
            Topic_Probability: topicProbability,
            Topic_Keywords: dominantTopic.words.slice(0, 5).join(', '),
            Topic_Description: JSON.stringify(allTopicProbabilities)
          });
        }

        // 3. Embeddings
        const cluster = embeddingsResults.find(c => 
          c.representative_responses.some(rep => 
            rep.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase() === 
            cleanResponse.toLowerCase()
          )
        );

        if (cluster) {
          const responseIdx = cluster.representative_responses.findIndex(rep =>
            rep.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase() === 
            cleanResponse.toLowerCase()
          );
          
          if (responseIdx !== -1) {
            const coordinates = cluster.coordinates[responseIdx];
            const embeddings = cluster.embeddings[responseIdx];
            
            embeddingsRows.push({
              Prompt: prompt.text,
              Response: cleanResponse,
              processed_response: cleanResponse.toLowerCase().replace(/[^\w\s]/g, ''),
              pca_one: coordinates[0],
              pca_two: coordinates[1],
              cluster: Math.round(cluster.cluster_id),
              pca_cluster_number: `Cluster ${cluster.cluster_id}`,
              raw_embeddings: embeddings
            });
          }
        }

        responseIndex++;
      });
    });
  });

  // Create merged rows by combining all data based on Prompt and Response
  const mergedRows = llmRows.map(llmRow => {
    const matchingLDA = ldaRows.find(
      row => row.Prompt === llmRow.Prompt && row.Response === llmRow.Response
    );
    const matchingEmbeddings = embeddingsRows.find(
      row => 
        row.Prompt === llmRow.Prompt && 
        row.Response.replace(/[\n\r\s]+/g, ' ').trim().toLowerCase() === 
        llmRow.Response.toLowerCase()
    );

    return {
      ...llmRow,
      ...(matchingLDA && {
        Dominant_Topic: matchingLDA.Dominant_Topic,
        Topic_Probability: matchingLDA.Topic_Probability,
        Topic_Keywords: matchingLDA.Topic_Keywords,
        Topic_Distribution: matchingLDA.Topic_Description // Include full distribution
      }),
      ...(matchingEmbeddings && {
        pca_one: matchingEmbeddings.pca_one,
        pca_two: matchingEmbeddings.pca_two,
        cluster: Math.round(matchingEmbeddings.cluster),
        pca_cluster_number: matchingEmbeddings.pca_cluster_number,
        raw_embeddings: matchingEmbeddings.raw_embeddings
      })
    };
  });

  // Use Papa Parse to convert to CSV
  const csv = Papa.unparse(mergedRows, {
    quotes: true,
    delimiter: ",",
    header: true
  });

  return csv;
} 