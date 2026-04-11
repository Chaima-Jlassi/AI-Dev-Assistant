# Enhanced RAG retriever with better organization and error handling
from typing import List, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss

from config import CONFIG
from logger import logger
from errors import RAGError
from data.uml_examples_v2 import DOCUMENTS, DOCUMENT_METADATA


class RAGRetriever:
    """
    Retrieval-Augmented Generation for UML examples
    
    Provides relevant examples to improve LLM-generated PlantUML
    """
    
    def __init__(self, 
                 documents: List[str] = None,
                 embedding_model: str = None,
                 top_k: int = None):
        """
        Initialize RAG retriever
        
        Args:
            documents: List of documents to index (uses default if None)
            embedding_model: Embedding model name
            top_k: Number of documents to retrieve
        """
        self.documents = documents or DOCUMENTS
        self.metadata = DOCUMENT_METADATA if documents is None else {}
        self.embedding_model_name = embedding_model or CONFIG.rag.embedding_model
        self.top_k = top_k or CONFIG.rag.top_k
        
        logger.info(f"Initializing RAG with {len(self.documents)} documents")
        
        # Load embedding model
        try:
            logger.info(f"Loading embedding model: {self.embedding_model_name}")
            self.model = SentenceTransformer(self.embedding_model_name)
            logger.info(f"Model loaded (embedding dim: {self.model.get_sentence_embedding_dimension()})")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise RAGError(f"Failed to load embedding model: {e}") from e
        
        # Build index
        self._build_index()
    
    def _build_index(self):
        """Build FAISS index from documents"""
        try:
            logger.info("Building FAISS index...")
            
            # Encode documents
            doc_embeddings = self.model.encode(self.documents)
            logger.info(f"Encoded {len(doc_embeddings)} documents")
            
            # Create FAISS index
            dimension = len(doc_embeddings[0])
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(np.array(doc_embeddings).astype('float32'))
            
            logger.info(f"FAISS index created (dimension: {dimension}, count: {self.index.ntotal})")
            
        except Exception as e:
            logger.error(f"Failed to build index: {e}")
            raise RAGError(f"Failed to build index: {e}") from e
    
    def retrieve(self, query: str, top_k: int = None) -> Tuple[List[str], List[float]]:
        """
        Retrieve relevant documents for a query
        
        Args:
            query: User query
            top_k: Number of documents to return (uses default if None)
            
        Returns:
            Tuple of (documents, similarities)
            
        Raises:
            RAGError: If retrieval fails
        """
        try:
            top_k = top_k or self.top_k
            
            logger.info(f"Retrieving top {top_k} documents for query: {query[:50]}...")
            
            # Encode query
            query_embedding = self.model.encode([query])
            
            # Search
            distances, indices = self.index.search(
                np.array(query_embedding).astype('float32'),
                min(top_k, len(self.documents))  # Don't request more than available
            )
            
            # Convert distances to similarities (L2 distance to similarity)
            # Lower distance = higher similarity
            similarities = [1.0 / (1.0 + d) for d in distances[0]]
            
            # Filter by minimum similarity if configured
            results = []
            result_sims = []
            for idx, sim in zip(indices[0], similarities):
                if sim >= CONFIG.rag.min_similarity:
                    results.append(self.documents[idx])
                    result_sims.append(sim)
            
            logger.info(f"Retrieved {len(results)} relevant documents (min similarity: {CONFIG.rag.min_similarity})")
            
            return results, result_sims
            
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            raise RAGError(f"Retrieval failed: {e}") from e
    
    def retrieve_with_metadata(self, query: str, top_k: int = None) -> List[dict]:
        """
        Retrieve documents with metadata
        
        Args:
            query: User query
            top_k: Number of documents
            
        Returns:
            List of dicts with 'content', 'similarity', and 'metadata'
        """
        results, similarities = self.retrieve(query, top_k)
        
        output = []
        for result, sim in zip(results, similarities):
            meta = self.metadata.get(result, {})
            output.append({
                "content": result,
                "similarity": float(sim),
                "metadata": meta
            })
        
        return output


def retrieve_context(query: str, k: int = 2) -> str:
    """
    Backward-compatible function to retrieve context
    
    Args:
        query: User query
        k: Number of results
        
    Returns:
        Concatenated relevant documents
    """
    try:
        retriever = RAGRetriever()
        results, _ = retriever.retrieve(query, top_k=k)
        
        if not results:
            logger.warning("No relevant documents found, returning empty context")
            return ""
        
        context = "\n---\n".join(results)
        logger.info(f"Context assembled from {len(results)} documents")
        return context
        
    except RAGError as e:
        logger.error(f"Failed to retrieve context: {e}")
        return ""
