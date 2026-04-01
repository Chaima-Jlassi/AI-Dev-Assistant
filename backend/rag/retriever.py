from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from data.uml_examples import DOCUMENTS

# Load embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Encode documents
doc_embeddings = model.encode(DOCUMENTS)

# Create FAISS index
dimension = len(doc_embeddings[0])
index = faiss.IndexFlatL2(dimension)
index.add(np.array(doc_embeddings))


def retrieve_context(query: str, k: int = 2):
    query_embedding = model.encode([query])
    distances, indices = index.search(np.array(query_embedding), k)

    results = [DOCUMENTS[i] for i in indices[0]]
    return "\n".join(results)