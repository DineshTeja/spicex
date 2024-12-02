import pandas as pd
import numpy as np
from scipy.optimize import linear_sum_assignment
import json
import sys
import os
import traceback

# Add custom JSON encoder to handle NaN values
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.float32, np.float64)):
            if np.isnan(obj):
                return None  # Convert NaN to null
            return float(obj)
        return super().default(obj)

def calculate_agreement(labels1, labels2):
    # Create a contingency table
    contingency_table = pd.crosstab(labels1, labels2)
    print(f"\nContingency table:\n{contingency_table}", file=sys.stderr)
    
    # Solve the assignment problem using the Hungarian algorithm
    row_ind, col_ind = linear_sum_assignment(-contingency_table.values)
    
    # Calculate the agreement score
    matched_count = contingency_table.values[row_ind, col_ind].sum()
    total_count = len(labels1)
    agreement_score = float(matched_count / total_count)
    
    print(f"Matched count: {matched_count}", file=sys.stderr)
    print(f"Total count: {total_count}", file=sys.stderr)
    print(f"Agreement score: {agreement_score}", file=sys.stderr)
    
    return agreement_score, row_ind, col_ind

def get_optimal_mapping(labels1, labels2):
    # Create contingency table
    contingency_table = pd.crosstab(labels1, labels2)
    
    # Get optimal assignment
    row_ind, col_ind = linear_sum_assignment(-contingency_table.values)
    
    # Create mapping dictionary including -1 for noise points
    unique_labels1 = np.unique(labels1)
    unique_labels2 = np.unique(labels2)
    
    mapping = {int(k): int(v) for k, v in zip(unique_labels1[row_ind], unique_labels2[col_ind])}
    
    # Add special handling for noise points (-1)
    if -1 in unique_labels1 and -1 not in mapping:
        mapping[-1] = -1
        
    print(f"\nMapping: {mapping}", file=sys.stderr)
    return mapping

def calculate_agreement_scores():
    try:
        # Get absolute path to CSV file
        csv_path = os.path.join(os.getcwd(), 'public', 'merged_analysis.csv')
        print(f"Looking for CSV at: {csv_path}", file=sys.stderr)
        
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found at {csv_path}")
            
        # Read data from the public directory
        df = pd.read_csv(csv_path)
        print(f"Successfully read CSV with {len(df)} rows", file=sys.stderr)
        print(f"CSV columns: {df.columns.tolist()}", file=sys.stderr)
        
        # Print sample of raw data
        print("\nSample of raw data:", file=sys.stderr)
        print(df[['cluster', 'Dominant_Topic', 'pca_cluster_number']].head(), file=sys.stderr)
        
        # Check for required columns
        required_columns = ['cluster', 'Dominant_Topic', 'pca_cluster_number', 'pca_one', 'pca_two']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Instead of filling with -1, drop rows with null values
        df = df.dropna(subset=['cluster', 'Dominant_Topic', 'pca_cluster_number'])
        
        # Fill only PCA coordinates with 0.0 if needed
        df['pca_one'] = df['pca_one'].fillna(0.0)
        df['pca_two'] = df['pca_two'].fillna(0.0)
        
        # Convert labels to numeric, preserving original values
        labels1 = df['cluster']  # cluster labels
        labels2 = df['Dominant_Topic']  # topic labels
        pca_labels = pd.Categorical(df['pca_cluster_number']).codes
        
        # Calculate agreement scores
        print("\nCalculating cluster-topic agreement:", file=sys.stderr)
        cluster_topic_score, ct_row_ind, ct_col_ind = calculate_agreement(labels1, labels2)
        
        print("\nCalculating cluster-PCA agreement:", file=sys.stderr)
        cluster_pca_score, cp_row_ind, cp_col_ind = calculate_agreement(labels1, pca_labels)
        
        print("\nCalculating topic-PCA agreement:", file=sys.stderr)
        topic_pca_score, tp_row_ind, tp_col_ind = calculate_agreement(labels2, pca_labels)

        # Get mappings
        cluster_topic_mapping = get_optimal_mapping(labels1, labels2)
        cluster_pca_mapping = get_optimal_mapping(labels1, pca_labels)
        topic_pca_mapping = get_optimal_mapping(labels2, pca_labels)

        # Create visualization data
        visualization_data = []
        for _, row in df.iterrows():
            cluster = row['cluster']
            topic = row['Dominant_Topic']
            pca = pd.Categorical([row['pca_cluster_number']]).codes[0]
            
            # No need to check for -1 since we dropped those rows
            cluster_topic_agree = int(cluster_topic_mapping.get(cluster, -1) == topic)
            cluster_pca_agree = int(cluster_pca_mapping.get(cluster, -1) == pca)
            topic_pca_agree = int(topic_pca_mapping.get(topic, -1) == pca)
            
            visualization_data.append({
                'pca_one': float(row['pca_one']),
                'pca_two': float(row['pca_two']),
                'cluster_topic_agree': cluster_topic_agree,
                'cluster_pca_agree': cluster_pca_agree,
                'topic_pca_agree': topic_pca_agree
            })

        # Create contingency tables after labels are defined
        cluster_topic_table = pd.crosstab(labels1, labels2)
        cluster_pca_table = pd.crosstab(labels1, pca_labels)
        topic_pca_table = pd.crosstab(labels2, pca_labels)

        # Convert contingency tables to format needed by frontend
        def format_contingency_table(table, row_labels, col_labels):
            return {
                "table": table.values.tolist(),
                "rowLabels": [str(label) for label in row_labels],
                "colLabels": [str(label) for label in col_labels]
            }

        # Prepare results
        results = {
            'agreement_scores': {
                'cluster_topic': cluster_topic_score,
                'cluster_embedding': cluster_pca_score,
                'topic_embedding': topic_pca_score
            },
            'visualization_data': visualization_data,
            'mapping_data': {
                'cluster_topic_mapping': cluster_topic_mapping,
                'cluster_pca_mapping': cluster_pca_mapping,
                'topic_pca_mapping': topic_pca_mapping,
                'contingency_tables': {
                    'cluster_topic': format_contingency_table(
                        cluster_topic_table,
                        cluster_topic_table.index,
                        cluster_topic_table.columns
                    ),
                    'cluster_pca': format_contingency_table(
                        cluster_pca_table,
                        cluster_pca_table.index,
                        cluster_pca_table.columns
                    ),
                    'topic_pca': format_contingency_table(
                        topic_pca_table,
                        topic_pca_table.index,
                        topic_pca_table.columns
                    )
                }
            }
        }

        return results

    except Exception as e:
        error_details = {
            "error": f"Error calculating agreement scores: {str(e)}",
            "traceback": traceback.format_exc(),
            "type": str(type(e).__name__)
        }
        print(json.dumps(error_details), file=sys.stderr)
        raise

if __name__ == "__main__":
    try:
        results = calculate_agreement_scores()
        # Use the custom JSON encoder when dumping results
        print(json.dumps(results, cls=NumpyJSONEncoder))
    except Exception as e:
        error_details = {
            "error": f"Failed to calculate agreement scores: {str(e)}",
            "traceback": traceback.format_exc(),
            "type": str(type(e).__name__)
        }
        print(json.dumps(error_details), file=sys.stderr)
        sys.exit(1) 