'use client';

import { AgreementScores } from '@/app/types/pipeline';
import { Scatter, ScatterChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

type AgreementScoreVisualizationsProps = {
  agreementData: AgreementScores | null;
  embeddingsData: Array<{ pca_one: number; pca_two: number }>;
};

export function AgreementScoreVisualizations({
  agreementData,
  embeddingsData
}: AgreementScoreVisualizationsProps) {
  if (!agreementData) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Calculating agreement scores...</p>
      </div>
    );
  }

  // Create chart data from embeddings data and agreement scores
  const chartData = embeddingsData.map(embedding => ({
    pca_one: embedding.pca_one ?? 0,
    pca_two: embedding.pca_two ?? 0,
    clusterTopicAgree: agreementData.agreement_scores.cluster_topic,
    clusterEmbeddingAgree: agreementData.agreement_scores.cluster_embedding,
    topicEmbeddingAgree: agreementData.agreement_scores.topic_embedding
  }));

  const ScatterPlot = ({
    data,
    dataKey,
    title
  }: {
    data: typeof chartData;
    dataKey: keyof (typeof chartData)[0];
    title: string;
  }) => (
    <div className="h-[300px] w-full p-4 border rounded-lg">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="pca_one"
            type="number"
            name="PCA Dimension 1"
            label={{ value: "PCA Dimension 1", position: "bottom" }}
          />
          <YAxis
            dataKey="pca_two"
            type="number"
            name="PCA Dimension 2"
            label={{ value: "PCA Dimension 2", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Agreement']}
            labelFormatter={(label) => `PCA 1: ${label.toFixed(2)}`}
          />
          <Scatter name={title} data={data} fill="#8884d8">
            {data.map((entry, idx) => (
              <circle
                key={idx}
                r={4}
                fill={`hsl(${entry[dataKey] * 120}, 70%, 50%)`}
                fillOpacity={0.6}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border bg-card">
        <div>
          <p className="font-medium">Cluster-Topic Agreement:</p>
          <p className="text-lg">{(agreementData.agreement_scores.cluster_topic * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="font-medium">Cluster-Embedding Agreement:</p>
          <p className="text-lg">{(agreementData.agreement_scores.cluster_embedding * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="font-medium">Topic-Embedding Agreement:</p>
          <p className="text-lg">{(agreementData.agreement_scores.topic_embedding * 100).toFixed(1)}%</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ScatterPlot
          data={chartData}
          dataKey="clusterTopicAgree"
          title="Cluster-Topic Agreement"
        />
        <ScatterPlot
          data={chartData}
          dataKey="clusterEmbeddingAgree"
          title="Cluster-Embedding Agreement"
        />
        <ScatterPlot
          data={chartData}
          dataKey="topicEmbeddingAgree"
          title="Topic-Embedding Agreement"
        />
      </div>
    </div>
  );
} 