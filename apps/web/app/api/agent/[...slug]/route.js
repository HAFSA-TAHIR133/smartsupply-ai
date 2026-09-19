import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/server/store";
import { executeAgentChat } from "@/lib/server/agent";

export async function POST(req, { params }) {
  const context = getAuthenticatedContext(req);
  if (!context.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const result = await executeAgentChat(context, {
      agentId: body.agentId || "supply-chain-agent",
      message: body.message,
      conversationId: body.conversationId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
