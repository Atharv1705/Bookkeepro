import chromadb
from chromadb.config import Settings
import os
import logging

logger = logging.getLogger(__name__)

# Ensure the database directory exists
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'chroma_db'))
os.makedirs(DB_PATH, exist_ok=True)

# Initialize ChromaDB client with persistent storage
client = chromadb.PersistentClient(path=DB_PATH)

# We'll use a single collection for all documents, using metadata to differentiate
collection = client.get_or_create_collection(
    name='documents',
    metadata={'hnsw:space': 'cosine'}
)


def add_document_embedding(doc_id: int, doc_type: str, user_id: int, text: str):
    """
    Adds a document's text to the vector database.
    We chunk the text into roughly 1000 character segments to improve search relevance.
    """
    if not text or not text.strip():
        logger.info(f"[VectorStore] Skipping empty text for doc {doc_id}")
        return
        
    logger.info(f"[VectorStore] Adding embeddings for doc {doc_id} (user {user_id})")
    
    # Simple chunking by fixed length (1000 chars)
    chunk_size = 1000
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    ids = [f"doc_{doc_type}_{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "doc_type": doc_type, "user_id": user_id, "chunk_index": i} for i in range(len(chunks))]
    
    collection.upsert(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )
    logger.info(f"[VectorStore] Added {len(chunks)} chunks for doc {doc_id}")


def search_documents(query: str, user_id: int, limit: int = 5):
    """
    Searches for documents matching the query for a specific user.
    Returns a list of dicts: {'doc_id': int, 'doc_type': str, 'distance': float}
    """
    logger.info(f'[VectorStore] Searching for: "{query}" (user {user_id})')
    
    try:
        results = collection.query(
            query_texts=[query],
            n_results=limit * 2, # Fetch more to account for duplicates
            where={"user_id": user_id}
        )
        
        if not results or not results['documents'] or len(results['documents'][0]) == 0:
            return []
            
        metadatas = results['metadatas'][0]
        distances = results['distances'][0]
        
        # We want to return unique documents, keeping the best score for each
        doc_scores = {}
        for meta, dist in zip(metadatas, distances):
            key = f"{meta['doc_type']}_{meta['doc_id']}"
            if key not in doc_scores or dist < doc_scores[key]['distance']:
                doc_scores[key] = {
                    'doc_id': meta['doc_id'],
                    'doc_type': meta['doc_type'],
                    'distance': dist
                }
                
        # Sort by distance
        sorted_docs = sorted(doc_scores.values(), key=lambda x: x['distance'])
        return sorted_docs[:limit]
        
    except Exception as e:
        logger.error(f"[VectorStore] Search failed: {e}")
        return []

def delete_document_embeddings(doc_id: int, doc_type: str):
    """
    Deletes all vector chunks associated with a specific document.
    """
    try:
        collection.delete(where={"$and": [{"doc_id": doc_id}, {"doc_type": doc_type}]})
        logger.info(f"[VectorStore] Deleted embeddings for {doc_type} document {doc_id}")
    except Exception as e:
        logger.error(f"[VectorStore] Failed to delete embeddings for doc {doc_id}: {e}")

def delete_user_embeddings(user_id: int):
    """
    Deletes all vector chunks associated with a specific user.
    """
    try:
        collection.delete(where={"user_id": user_id})
        logger.info(f"[VectorStore] Deleted all embeddings for user {user_id}")
    except Exception as e:
        logger.error(f"[VectorStore] Failed to delete embeddings for user {user_id}: {e}")
