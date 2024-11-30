import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import json
import sys
from typing import List, Dict

def initialize_nltk():
    """Download required NLTK data"""
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)

def clean_text(text: str) -> str:
    """Clean and preprocess text"""
    stop_words = set(stopwords.words('english'))
    stop_words -= {'he', 'she', 'him', 'her', 'his', 'hers', 'himself', 'herself'}
    
    # Handle non-string input
    if not isinstance(text, str):
        text = str(text)
    
    tokens = word_tokenize(text.lower())
    tokens = [token for token in tokens if 
             token.isalpha() and 
             token not in stop_words and
             len(token) > 2]
    return ' '.join(tokens)

def extract_concepts(responses: List[str], n_topics: int = 5) -> Dict:
    """Extract concepts using LDA"""
    try:
        # Initialize NLTK
        initialize_nltk()

        print(f"Received {len(responses)} responses", file=sys.stderr)
        
        # Clean responses
        cleaned_responses = [clean_text(response) for response in responses]
        
        # Ensure we have enough responses
        if len(cleaned_responses) < 2:
            return {
                'error': 'Not enough responses for analysis',
                'topics': [],
                'doc_topic_distributions': []
            }
        
        # Create document-term matrix with more lenient parameters
        vectorizer = CountVectorizer(
            max_df=0.99,  # More lenient max_df
            min_df=1,     # Allow terms that appear at least once
            stop_words='english',
            max_features=1000  # Limit vocabulary size
        )
        
        try:
            doc_term_matrix = vectorizer.fit_transform(cleaned_responses)
        except ValueError as e:
            print(f"Vectorization error: {str(e)}", file=sys.stderr)
            return {
                'error': 'Failed to create document-term matrix',
                'topics': [],
                'doc_topic_distributions': []
            }

        print(doc_term_matrix.shape, file=sys.stderr)  
        # Check if we have any terms
        if doc_term_matrix.shape[1] == 0:
            return {
                'error': 'No terms remained after text processing',
                'topics': [],
                'doc_topic_distributions': []
            }
        
        # Adjust number of topics based on data size
        n_topics = min(n_topics, len(cleaned_responses), doc_term_matrix.shape[1])
        
        print(f"Using {n_topics} topics", file=sys.stderr)
        
        # Train LDA model
        lda = LatentDirichletAllocation(
            n_components=n_topics,
            random_state=42,
            max_iter=20,
            learning_method='online',
            n_jobs=-1,
            doc_topic_prior=0.1,  # Make topics more distinct
            topic_word_prior=0.01  # Make word distributions more peaked
        )
        
        try:
            doc_topics = lda.fit_transform(doc_term_matrix)
        except Exception as e:
            print(f"LDA error: {str(e)}", file=sys.stderr)
            return {
                'error': 'Failed to perform topic modeling',
                'topics': [],
                'doc_topic_distributions': []
            }
        
        # Get feature names
        feature_names = vectorizer.get_feature_names_out()
        
        print(feature_names, file=sys.stderr)

        # Extract topics and their words
        topics = []
        for topic_idx, topic in enumerate(lda.components_):
            top_word_indices = topic.argsort()[:-10-1:-1]
            top_words = [feature_names[i] for i in top_word_indices]
            topic_weight = topic[top_word_indices].tolist()
            
            # Normalize weights
            total_weight = sum(topic_weight)
            if total_weight > 0:
                topic_weight = [w/total_weight for w in topic_weight]
            
            topics.append({
                'topic_id': int(topic_idx),
                'words': top_words,
                'weights': topic_weight
            })
        
        # Get document-topic distributions
        doc_topic_dist = doc_topics.tolist()

        print(doc_topic_dist, file=sys.stderr)
        
        return {
            'topics': topics,
            'doc_topic_distributions': doc_topic_dist
        }
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}", file=sys.stderr)
        return {
            'error': f'Unexpected error: {str(e)}',
            'topics': [],
            'doc_topic_distributions': []
        }

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        responses = json.loads(input_data)
        
        # Ensure we have a list of responses
        if not isinstance(responses, list):
            print(json.dumps({
                'error': 'Input must be a list of responses',
                'topics': [],
                'doc_topic_distributions': []
            }))
            sys.exit(1)
            
        results = extract_concepts(responses)
        print(json.dumps(results))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            'error': f'Invalid JSON input: {str(e)}',
            'topics': [],
            'doc_topic_distributions': []
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'error': f'Script error: {str(e)}',
            'topics': [],
            'doc_topic_distributions': []
        }))
        sys.exit(1) 