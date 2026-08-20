import type { SessionUpdate } from "@agentclientprotocol/sdk";
import { describe, expect, it } from "vitest";
import { mapAcpUpdate } from "../../tools/resource-editor/acp/eventMapper";

describe("ACP update mapper", () => {
  it("텍스트·계획·도구·usage를 브라우저 이벤트로 정규화한다", () => {
    const message = mapAcpUpdate("r1", { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "늑대 귀" } } as SessionUpdate);
    const plan = mapAcpUpdate("r1", { sessionUpdate: "plan", entries: [{ content: "귀 길이 조정", priority: "high", status: "pending" }] } as SessionUpdate);
    const tool = mapAcpUpdate("r1", { sessionUpdate: "tool_call", toolCallId: "t1", title: "read file", status: "in_progress" } as SessionUpdate);
    const usage = mapAcpUpdate("r1", { sessionUpdate: "usage_update", used: 120, size: 10_000 } as SessionUpdate);
    expect(message).toMatchObject({ type: "message", text: "늑대 귀" });
    expect(plan).toMatchObject({ type: "plan", entries: [{ content: "귀 길이 조정" }] });
    expect(tool).toMatchObject({ type: "tool", title: "read file" });
    expect(usage).toMatchObject({ type: "usage", used: 120, size: 10_000 });
  });
});
