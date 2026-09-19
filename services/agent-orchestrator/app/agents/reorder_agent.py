from typing import List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings

class ReorderAgent:
    """
    Reorder calculations powered by Groq's llama-3.3-70b-versatile.
    """
    def __init__(self):
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "gsk_your_groq_api_key_here":
            self.llm = ChatGroq(
                temperature=0,
                model_name="llama-3.3-70b-versatile",
                groq_api_key=settings.GROQ_API_KEY
            )
        else:
            self.llm = None

    @staticmethod
    def calculate_reorder_qty(current_qty: int, reorder_point: int) -> int:
        target_qty = reorder_point * 2.5
        needed = target_qty - current_qty
        return max(int(needed), 10)

    def analyze_reorder_reasoning(self, sku: str, recommended_qty: int, tenant_context: List[str]) -> str:
        """Uses Groq Llama-3.3-70b to summarize the reorder strategy for logging and audit."""
        if not self.llm:
            return f"Reorder generated for {sku}: {recommended_qty} units based on stock threshold rule."

        prompt = ChatPromptTemplate.from_template(
            "You are an AI Inventory Specialist. Context:\n{context}\n\n"
            "Analyze item {sku} which needs {qty} units reordered. "
            "Write a concise 1-sentence decision summary."
        )

        chain = prompt | self.llm
        try:
            response = chain.invoke({
                "context": "\n".join(tenant_context),
                "sku": sku,
                "qty": recommended_qty
            })
            return response.content
        except Exception as e:
            return f"Calculated reorder of {recommended_qty} units for {sku} based on reorder threshold."

    @staticmethod
    def evaluate_risk(recommended_qty: int, unit_price: float) -> bool:
        total_value = recommended_qty * unit_price
        return total_value > 500.0