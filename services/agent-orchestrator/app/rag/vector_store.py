from typing import List
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from app.config import settings

class TenantRAGPipeline:
    """
    Pinecone-backed Retrieval-Augmented Generation with strict tenant filtering.
    """
    def __init__(self):
        self.api_key = settings.PINECONE_API_KEY
        self.index_name = settings.PINECONE_INDEX_NAME
        self._embeddings = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        return self._embeddings

    def search_tenant_knowledge(self, tenant_id: str, query: str, k: int = 3) -> List[str]:
        if not self.api_key or self.api_key == "your_pinecone_api_key_here":
            return [f"Policy Doc for tenant {tenant_id}: Safety stock minimum threshold is 20 units."]

        try:
            vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                pinecone_api_key=self.api_key
            )
            results = vector_store.similarity_search(
                query,
                k=k,
                filter={"tenant_id": tenant_id}
            )
            return [doc.page_content for doc in results]
        except Exception as e:
            return [f"Fallback Policy Doc: Default batch minimum is 15 units. (Info: {str(e)})"]