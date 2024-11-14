import { useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ScatterDataPoint } from 'chart.js';

interface ConceptVisualizationsProps {
  conceptData: {
    concepts: Map<string, number>;
    raceDistributions: Map<string, Map<string, number>>;
  };
}

interface HeatmapDataPoint extends ScatterDataPoint {
  v: number;
}

export function ConceptVisualizations({ conceptData }: ConceptVisualizationsProps) {
  const overallChartRef = useRef<HTMLCanvasElement>(null);
  const distributionChartRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const normalizedHeatmapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!conceptData.concepts.size) return;

    // Clear any existing charts
    [overallChartRef, distributionChartRef, heatmapRef, normalizedHeatmapRef].forEach(ref => {
      if (ref.current) {
        const existingChart = Chart.getChart(ref.current);
        if (existingChart) existingChart.destroy();
      }
    });

    // Overall concept distribution chart
    const overallCtx = overallChartRef.current?.getContext('2d');
    if (overallCtx) {
      new Chart(overallCtx, {
        type: 'bar',
        data: {
          labels: Array.from(conceptData.concepts.keys()),
          datasets: [{
            label: 'Concept Frequency',
            data: Array.from(conceptData.concepts.values()),
            backgroundColor: 'rgba(75, 192, 192, 0.6)'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Overall Concept Distribution'
            }
          }
        }
      });
    }

    // Race-based distribution chart
    const distributionCtx = distributionChartRef.current?.getContext('2d');
    if (distributionCtx) {
      const datasets = Array.from(conceptData.raceDistributions.entries()).map(([race, concepts]) => ({
        label: race,
        data: Array.from(concepts.values()),
        backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.6)`
      }));

      new Chart(distributionCtx, {
        type: 'bar',
        data: {
          labels: Array.from(conceptData.concepts.keys()),
          datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Concept Distribution by Demographics'
            }
          }
        }
      });
    }

    // Create heatmap data
    const races = Array.from(conceptData.raceDistributions.keys());
    const concepts = Array.from(conceptData.concepts.keys());
    
    // Create raw heatmap
    const heatmapData = races.map(race => {
      const raceMap = conceptData.raceDistributions.get(race) || new Map();
      return concepts.map(concept => raceMap.get(concept) || 0);
    });

    // Create normalized heatmap (column-wise normalization)
    const normalizedData = heatmapData.map(row => {
      const rowSum = row.reduce((a, b) => a + b, 0);
      return row.map(value => rowSum ? value / rowSum : 0);
    });

    // Raw heatmap
    const heatmapCtx = heatmapRef.current?.getContext('2d');
    if (heatmapCtx) {
      const config: ChartConfiguration<'scatter', HeatmapDataPoint[]> = {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Concept Distribution Heatmap',
            data: heatmapData.flatMap((row, i) => 
              row.map((value, j) => ({
                x: j,
                y: i,
                v: value
              }))
            ),
            backgroundColor(context) {
              if (!context.raw) return 'rgba(0, 0, 255, 0)';
              const value = (context.raw as HeatmapDataPoint).v;
              const maxValue = Math.max(...heatmapData.flat());
              const alpha = value / maxValue;
              return `rgba(0, 0, 255, ${alpha})`;
            },
            pointRadius: 20,
            pointStyle: 'rect'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Raw Concept Distribution Heatmap'
            },
            tooltip: {
              callbacks: {
                label(context) {
                  if (!context.raw) return '';
                  const value = (context.raw as HeatmapDataPoint).v;
                  return `Count: ${value}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'category',
              labels: concepts,
              offset: true
            },
            y: {
              type: 'category',
              labels: races,
              offset: true
            }
          }
        }
      };

      new Chart(heatmapCtx, config);
    }

    // Normalized heatmap
    const normalizedHeatmapCtx = normalizedHeatmapRef.current?.getContext('2d');
    if (normalizedHeatmapCtx) {
      const config: ChartConfiguration<'scatter', HeatmapDataPoint[]> = {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Normalized Concept Distribution Heatmap',
            data: normalizedData.flatMap((row, i) => 
              row.map((value, j) => ({
                x: j,
                y: i,
                v: value
              }))
            ),
            backgroundColor(context) {
              if (!context.raw) return 'rgba(0, 0, 255, 0)';
              const value = (context.raw as HeatmapDataPoint).v;
              return `rgba(0, 0, 255, ${value})`;
            },
            pointRadius: 20,
            pointStyle: 'rect'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Normalized Concept Distribution Heatmap'
            },
            tooltip: {
              callbacks: {
                label(context) {
                  if (!context.raw) return '';
                  const value = (context.raw as HeatmapDataPoint).v;
                  return `Normalized Value: ${value.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'category',
              labels: concepts,
              offset: true
            },
            y: {
              type: 'category',
              labels: races,
              offset: true
            }
          }
        }
      };

      new Chart(normalizedHeatmapCtx, config);
    }

  }, [conceptData]);

  return (
    <Card className="mt-6">
      <CardContent className="space-y-6 pt-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Overall Concept Distribution</h3>
          <canvas ref={overallChartRef} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Concept Distribution by Demographics</h3>
          <canvas ref={distributionChartRef} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Raw Distribution Heatmap</h3>
          <canvas ref={heatmapRef} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Normalized Distribution Heatmap</h3>
          <canvas ref={normalizedHeatmapRef} />
        </div>
      </CardContent>
    </Card>
  );
} 