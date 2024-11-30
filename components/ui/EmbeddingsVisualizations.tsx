import { Card } from "./card";
import { Badge } from "./badge";

type EmbeddingsResult = {
  cluster_id: number;
  size: number;
  representative_responses: string[];
  distribution: { [key: string]: number };
};

interface EmbeddingsVisualizationsProps {
  results: EmbeddingsResult[];
}

export function EmbeddingsVisualizations({ results }: EmbeddingsVisualizationsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Embeddings Concept Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((cluster) => (
          <Card key={cluster.cluster_id} className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Cluster {cluster.cluster_id + 1}</h4>
                <Badge variant="secondary">Size: {cluster.size}</Badge>
              </div>
              
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Representative Responses:</h5>
                {cluster.representative_responses.map((response, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    {response}
                  </p>
                ))}
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2">Distribution:</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cluster.distribution).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 