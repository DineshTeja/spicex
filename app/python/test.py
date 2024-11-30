import requests

API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": "Bearer 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"}

def query(payload):
	response = requests.post(API_URL, headers=headers, json=payload)
	return response.json()

if __name__ == "__main__":
    print(query({
        "inputs": {
        "source_sentence": "That is a happy person",
        "sentences": [
            "That is a happy dog",
            "That is a very happy person",
            "Today is a sunny day"
        ]
    },
    }))