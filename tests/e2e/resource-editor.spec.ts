import { expect, test } from "@playwright/test";

test("리소스 선택부터 fake ACP 승인·HMR·검증까지 한 화면에서 수행한다", async ({ page, request }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/?mode=editor");
  await expect(page.getByTestId("resource-editor")).toBeVisible();
  await expect(page.getByText("절차형 리소스 편집 작업대")).toBeVisible();
  await expect(page.locator(".re-asset-row")).toHaveCount(655);
  const health = await page.evaluate(async () => fetch("/api/resource-editor/health").then((response) => response.json())) as { protocol: string; fakeAgent: boolean };
  const unauthorized = await request.post("/api/resource-editor/captures", { data: {} });
  expect({ health, unauthorizedStatus: unauthorized.status() }).toMatchObject({ health: { protocol: "ACP v1", fakeAgent: true }, unauthorizedStatus: 401 });

  await page.getByPlaceholder("이름, ID, 태그").fill("비전 늑대");
  await expect(page.locator(".re-asset-row")).toHaveCount(1);
  await page.locator(".re-asset-row > button").first().click();
  await expect(page.locator("#re-asset-label")).toContainText("비전 늑대");
  await expect(page.locator(".re-node")).not.toHaveCount(0);

  const namedPart = page.locator(".re-node").filter({ hasText: /ear|head/i }).first();
  await namedPart.click();
  const partKey = page.getByTestId("part-key");
  await expect(partKey).not.toHaveText("—");
  const savedPartKey = await partKey.textContent();
  await page.locator("[data-overlay=axes]").check();
  await page.getByRole("button", { name: "측면" }).click();
  await page.locator(".re-viewport-wrap").screenshot({ path: testInfo.outputPath("resource-editor-wolf-side.png") });

  await page.getByPlaceholder(/이 늑대의 귀/).fill("선택한 귀를 조금 더 길고 뒤로 젖혀 달라");
  await page.getByRole("button", { name: "계획 요청" }).click();
  await expect(page.locator(".re-agent-status")).toHaveAttribute("data-status", "awaiting-approval");
  await expect(page.locator(".re-timeline")).toContainText("소유 파일을 확인했다");
  await expect(page.getByRole("button", { name: "계획 승인·적용" })).toBeEnabled();
  await page.getByRole("button", { name: "계획 승인·적용" }).click();
  await expect(page.getByText("사용자 승인 필요")).toBeVisible();
  await page.getByRole("button", { name: "이번 요청 허용" }).click();
  await expect(page.locator(".re-agent-status")).toHaveAttribute("data-status", "completed");
  await expect(page.locator(".re-timeline")).toContainText("fake 적용·HMR·검증 흐름이 완료됐다");
  await expect(page.getByRole("button", { name: "BEFORE / AFTER" })).toBeEnabled();

  await page.reload();
  await expect(page.locator("#re-asset-label")).toContainText("비전 늑대");
  await expect(page.getByTestId("part-key")).toHaveText(savedPartKey ?? "");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
