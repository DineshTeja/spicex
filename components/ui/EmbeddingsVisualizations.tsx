import { Card } from "./card";
import { Badge } from "./badge";
import { useState } from "react";
import { Button } from "./button";
import { ChevronDown, ChevronUp } from "lucide-react";

type EmbeddingsResult = {
    cluster_id: number;
    size: number;
    representative_responses: string[];
    distribution: { [key: string]: number };
};

interface EmbeddingsVisualizationsProps {
    results: EmbeddingsResult[];
}

const ITEMS_PER_PAGE = 5;

export function EmbeddingsVisualizations({ results }: EmbeddingsVisualizationsProps) {
    const [pagination, setPagination] = useState<{
        [key: number]: {
            page: number;
            expanded: Set<number>;
        };
    }>({});

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((cluster) => (
                    <Card key={cluster.cluster_id} className="p-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium">Cluster {cluster.cluster_id + 1}</h4>
                                <Badge variant="secondary">Size: {cluster.size}</Badge>
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

                            <div className="space-y-2">
                                <h5 className="font-medium text-sm tracking-tight pb-1 border-b">Responses:</h5>
                                {cluster.representative_responses
                                    .slice(
                                        (pagination[cluster.cluster_id]?.page || 0) * ITEMS_PER_PAGE,
                                        ((pagination[cluster.cluster_id]?.page || 0) + 1) * ITEMS_PER_PAGE
                                    )
                                    .map((response, idx) => {
                                        const absoluteIdx = idx + (pagination[cluster.cluster_id]?.page || 0) * ITEMS_PER_PAGE;
                                        const isExpanded = pagination[cluster.cluster_id]?.expanded?.has(absoluteIdx);

                                        return (
                                            <div key={idx} className="border rounded-lg p-3">
                                                <div
                                                    className="flex items-center justify-between cursor-pointer"
                                                    onClick={() => {
                                                        setPagination(prev => {
                                                            const currentExpanded = new Set(prev[cluster.cluster_id]?.expanded || []);
                                                            if (isExpanded) {
                                                                currentExpanded.delete(absoluteIdx);
                                                            } else {
                                                                currentExpanded.add(absoluteIdx);
                                                            }
                                                            return {
                                                                ...prev,
                                                                [cluster.cluster_id]: {
                                                                    page: prev[cluster.cluster_id]?.page || 0,
                                                                    expanded: currentExpanded
                                                                }
                                                            };
                                                        });
                                                    }}
                                                >
                                                    <p className="text-sm font-medium">{response.slice(0, 50) + (response.length > 50 ? '...' : '')}</p>
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                                    )}
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-2">
                                                        <p className="text-sm text-muted-foreground">{response}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                {/* Pagination Controls */}
                                {cluster.representative_responses.length > ITEMS_PER_PAGE && (
                                    <div className="flex justify-center gap-2 mt-3 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setPagination(prev => ({
                                                    ...prev,
                                                    [cluster.cluster_id]: {
                                                        page: Math.max(0, (prev[cluster.cluster_id]?.page || 0) - 1),
                                                        expanded: prev[cluster.cluster_id]?.expanded || new Set()
                                                    }
                                                }));
                                            }}
                                            disabled={(pagination[cluster.cluster_id]?.page || 0) === 0}
                                        >
                                            Previous
                                        </Button>

                                        <span className="flex items-center text-sm text-muted-foreground">
                                            Page {(pagination[cluster.cluster_id]?.page || 0) + 1} of{' '}
                                            {Math.ceil(cluster.representative_responses.length / ITEMS_PER_PAGE)}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setPagination(prev => ({
                                                    ...prev,
                                                    [cluster.cluster_id]: {
                                                        page: Math.min(
                                                            Math.ceil(cluster.representative_responses.length / ITEMS_PER_PAGE) - 1,
                                                            (prev[cluster.cluster_id]?.page || 0) + 1
                                                        ),
                                                        expanded: prev[cluster.cluster_id]?.expanded || new Set()
                                                    }
                                                }));
                                            }}
                                            disabled={
                                                (pagination[cluster.cluster_id]?.page || 0) >=
                                                Math.ceil(cluster.representative_responses.length / ITEMS_PER_PAGE) - 1
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
} 