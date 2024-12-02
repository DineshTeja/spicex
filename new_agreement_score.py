import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import Dict, List, Tuple, TypedDict, Union
import json
import sys

class AgreementScores(TypedDict):
    agreement_scores: Dict[str, float]
    cluster_topic_mapping: Dict[int, int]
    cluster_pca_mapping: Dict[int, int]
    topic_pca_mapping: Dict[int, int]

def calculate_agreement(
    cluster_labels: List[int],
    topic_labels: List[int], 
    pca_cluster_labels: List[int]
) -> AgreementScores:
    """Calculate agreement scores between different clustering methods."""
    if not cluster_labels or not topic_labels or not pca_cluster_labels:
        raise ValueError("Empty label lists provided")
        
    # Get number of unique labels for each method
    n_clusters = max(cluster_labels) + 1
    n_topics = max(topic_labels) + 1
    n_pca_clusters = max(pca_cluster_labels) + 1

    # Create confusion matrices with proper sizes
    confusion_matrix_cluster_topic = np.zeros((n_clusters, n_topics))
    confusion_matrix_cluster_pca = np.zeros((n_clusters, n_pca_clusters))
    confusion_matrix_topic_pca = np.zeros((n_topics, n_pca_clusters))

    # Fill confusion matrices
    for i in range(len(cluster_labels)):
        confusion_matrix_cluster_topic[cluster_labels[i], topic_labels[i]] += 1
        confusion_matrix_cluster_pca[cluster_labels[i], pca_cluster_labels[i]] += 1
        confusion_matrix_topic_pca[topic_labels[i], pca_cluster_labels[i]] += 1

    # Use Hungarian algorithm to find optimal matchings
    row_ind_ct, col_ind_ct = linear_sum_assignment(-confusion_matrix_cluster_topic)
    row_ind_cp, col_ind_cp = linear_sum_assignment(-confusion_matrix_cluster_pca)
    row_ind_tp, col_ind_tp = linear_sum_assignment(-confusion_matrix_topic_pca)

    # Calculate agreement scores
    total_matches_ct = confusion_matrix_cluster_topic[row_ind_ct, col_ind_ct].sum()
    total_matches_cp = confusion_matrix_cluster_pca[row_ind_cp, col_ind_cp].sum()
    total_matches_tp = confusion_matrix_topic_pca[row_ind_tp, col_ind_tp].sum()

    total_samples = len(cluster_labels)
    agreement_score_ct = float(total_matches_ct / total_samples)
    agreement_score_cp = float(total_matches_cp / total_samples)
    agreement_score_tp = float(total_matches_tp / total_samples)

    # Create mapping dictionaries
    cluster_to_topic = {int(cluster): int(topic) for cluster, topic in zip(row_ind_ct, col_ind_ct)}
    cluster_to_pca = {int(cluster): int(pca) for cluster, pca in zip(row_ind_cp, col_ind_cp)}
    topic_to_pca = {int(topic): int(pca) for topic, pca in zip(row_ind_tp, col_ind_tp)}

    return {
        "agreement_scores": {
            "cluster_topic": agreement_score_ct,
            "cluster_embedding": agreement_score_cp,
            "topic_embedding": agreement_score_tp
        },
        "cluster_topic_mapping": cluster_to_topic,
        "cluster_pca_mapping": cluster_to_pca,
        "topic_pca_mapping": topic_to_pca
    }

def process_analysis_results(data: Dict) -> AgreementScores:
    """Process complete analysis results and calculate agreement scores."""
    try:
        # Extract data from the complete results structure
        llm_results = data["conceptResults"]["llm"]
        lda_results = data["conceptResults"]["lda"]
        embedding_results = data["conceptResults"]["embeddings"]
        
        # Process LLM clusters
        cluster_labels = []
        if "clusters" in llm_results and llm_results["clusters"]:
            for cluster in llm_results["clusters"]:
                cluster_id = cluster["id"]
                # Use the sum of frequencies for each concept in the cluster
                frequency = sum(cluster["frequency"])
                cluster_labels.extend([cluster_id] * frequency)
        
        # Process LDA topics
        topic_labels = []
        if lda_results and "topics" in lda_results and lda_results["topics"]:
            for topic in lda_results["topics"]:
                # Convert topic weights to frequencies
                frequency = int(sum(topic["weights"]) * 100)
                topic_labels.extend([topic["topic_id"]] * frequency)
        
        # Process embedding clusters
        pca_cluster_labels = []
        if embedding_results:
            for cluster in embedding_results:
                cluster_id = cluster["cluster_id"]
                size = cluster["size"]
                pca_cluster_labels.extend([cluster_id] * size)
        
        # Validate data
        if not cluster_labels or not topic_labels or not pca_cluster_labels:
            raise ValueError("One or more clustering results are empty")
            
        # Ensure all lists have the same length by taking the minimum length
        min_length = min(len(cluster_labels), len(topic_labels), len(pca_cluster_labels))
        if min_length == 0:
            raise ValueError("No valid clustering data found")
            
        cluster_labels = cluster_labels[:min_length]
        topic_labels = topic_labels[:min_length]
        pca_cluster_labels = pca_cluster_labels[:min_length]

        return calculate_agreement(cluster_labels, topic_labels, pca_cluster_labels)
        
    except KeyError as e:
        raise ValueError(f"Missing required data in input: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error processing analysis results: {str(e)}")

if __name__ == "__main__":
    try:
        # Read JSON data from stdin
        input_data = json.load(sys.stdin)
        
        # Calculate agreement scores
        agreement_scores = process_analysis_results(input_data)
        
        # Output results as JSON
        print(json.dumps(agreement_scores))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Invalid JSON input: {str(e)}"
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": f"Failed to process results: {str(e)}"
        }), file=sys.stderr)
        sys.exit(1) 