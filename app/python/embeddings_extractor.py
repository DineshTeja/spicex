import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.cluster import KMeans
import requests
import traceback
import time
import json
import sys
from typing import List

API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": f"Bearer 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"}

def get_embeddings(texts):
    try:
        payload = {
            "inputs": {
                "source_sentence": texts[0],
                "sentences": texts
            }
        }
        
        # Send progress update
        print(json.dumps({
            "type": "progress",
            "message": "Getting embeddings from Hugging Face API",
            "progress": {"processed": 0, "total": len(texts)}
        }), flush=True)
        
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        similarities = np.array(result)
        embeddings = similarities.reshape(len(texts), -1)
            
        return embeddings
        
    except Exception as e:
        raise Exception(f"Failed to get embeddings: {str(e)}")

def extract_concepts_with_embeddings(input_data):
    try:
        # Parse input data
        responses = [item["response"] for item in input_data]
        races = [item["race"] for item in input_data]
        
        # Get embeddings
        embeddings = get_embeddings(responses)
        
        # Progress update for clustering
        print(json.dumps({
            "type": "progress",
            "message": "Clustering embeddings",
            "progress": {"processed": len(responses), "total": len(responses)}
        }), flush=True)

        # Clustering
        n_clusters = min(2, len(responses))  # Ensure we don't try to create more clusters than samples
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        # Extract cluster information
        cluster_concepts = []
        for i in range(n_clusters):
            cluster_mask = cluster_labels == i
            cluster_responses = np.array(responses)[cluster_mask]
            
            if len(cluster_responses) > 0:
                # Get all responses in the cluster as representative responses
                representative_responses = cluster_responses.tolist()
                
                # Calculate distribution
                distribution = {
                    race: int(np.sum((np.array(races)[cluster_mask] == race)))
                    for race in set(races)
                }
                
                cluster_concepts.append({
                    "cluster_id": int(i),
                    "size": int(np.sum(cluster_mask)),
                    "representative_responses": representative_responses,
                    "distribution": distribution
                })
        
        # Send final results
        print(json.dumps(cluster_concepts), flush=True)
        
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "error": str(e)
        }), flush=True)

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        extract_concepts_with_embeddings(input_data)
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "error": str(e)
        }), flush=True) 