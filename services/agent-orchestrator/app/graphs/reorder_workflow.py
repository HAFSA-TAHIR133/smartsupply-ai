from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
from app.memory.tenant_memory import TenantMemoryManager
from app.rag.vector_store import TenantRAGPipeline
from app.agents.reorder_agent import ReorderAgent
from app.hitl.approval_manager import HITLApprovalManager

memory_manager = TenantMemoryManager()
rag_pipeline = TenantRAGPipeline()
reorder_agent = ReorderAgent()
hitl_manager = HITLApprovalManager()

class ReorderWorkflowState(TypedDict):
    tenant_id: str
    product_id: str
    sku: str
    current_quantity: int
    reorder_point: int
    unit_price: float
    recommended_quantity: int
    context_memories: List[str]
    vendor_preference: Optional[str]
    ai_reasoning: Optional[str]
    needs_hitl_approval: bool
    hitl_request_id: Optional[str]
    status: str

def analyze_inventory_node(state: ReorderWorkflowState) -> ReorderWorkflowState:
    rec_qty = reorder_agent.calculate_reorder_qty(
        state["current_quantity"],
        state["reorder_point"]
    )
    state["recommended_quantity"] = rec_qty
    state["status"] = "ANALYZED"
    return state

def fetch_tenant_context_node(state: ReorderWorkflowState) -> ReorderWorkflowState:
    # 1. Fetch isolated tenant memories from Mem0
    memories = memory_manager.get_tenant_context(state["tenant_id"], state["sku"])
    
    # 2. Query Pinecone for tenant-filtered documents
    docs = rag_pipeline.search_tenant_knowledge(state["tenant_id"], state["sku"])

    combined_context = memories + docs
    state["context_memories"] = combined_context
    state["vendor_preference"] = memories[0] if memories else "Default Vendor"
    
    # 3. Generate AI reasoning summary using Groq
    reasoning = reorder_agent.analyze_reorder_reasoning(
        state["sku"],
        state["recommended_quantity"],
        combined_context
    )
    state["ai_reasoning"] = reasoning
    state["status"] = "CONTEXT_FETCHED"
    return state

def evaluate_hitl_node(state: ReorderWorkflowState) -> ReorderWorkflowState:
    requires_hitl = reorder_agent.evaluate_risk(
        state["recommended_quantity"],
        state["unit_price"]
    )
    state["needs_hitl_approval"] = requires_hitl

    if requires_hitl:
        req_id = hitl_manager.create_approval_request(state["tenant_id"], state)
        state["hitl_request_id"] = req_id
        state["status"] = "WAITING_HUMAN_APPROVAL"
    else:
        state["status"] = "AUTO_APPROVED"
        
    return state

def build_reorder_graph():
    graph = StateGraph(ReorderWorkflowState)

    graph.add_node("analyze_inventory", analyze_inventory_node)
    graph.add_node("fetch_tenant_context", fetch_tenant_context_node)
    graph.add_node("evaluate_hitl", evaluate_hitl_node)

    graph.set_entry_point("analyze_inventory")
    graph.add_edge("analyze_inventory", "fetch_tenant_context")
    graph.add_edge("fetch_tenant_context", "evaluate_hitl")
    graph.add_edge("evaluate_hitl", END)

    return graph.compile()