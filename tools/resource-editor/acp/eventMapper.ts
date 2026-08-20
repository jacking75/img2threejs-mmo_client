import type { SessionUpdate } from "@agentclientprotocol/sdk";
import type { EditorHostEvent } from "../../../src/dev/resource-editor/editorTypes";

export function mapAcpUpdate(requestId: string, update: SessionUpdate): EditorHostEvent | null {
  if (update.sessionUpdate === "agent_message_chunk" || update.sessionUpdate === "agent_thought_chunk") {
    if (update.content.type !== "text") return null;
    return {
      type: "message",
      requestId,
      role: update.sessionUpdate === "agent_message_chunk" ? "agent" : "thought",
      text: update.content.text,
    };
  }
  if (update.sessionUpdate === "plan") {
    return { type: "plan", requestId, entries: update.entries.map((entry) => ({ content: entry.content, status: entry.status })) };
  }
  if (update.sessionUpdate === "tool_call") {
    return { type: "tool", requestId, title: update.title, status: update.status ?? "pending", kind: update.kind };
  }
  if (update.sessionUpdate === "tool_call_update") {
    return { type: "tool", requestId, title: update.title ?? update.toolCallId, status: update.status ?? "running", kind: update.kind ?? undefined };
  }
  if (update.sessionUpdate === "usage_update") {
    return { type: "usage", requestId, used: update.used, size: update.size };
  }
  return null;
}
