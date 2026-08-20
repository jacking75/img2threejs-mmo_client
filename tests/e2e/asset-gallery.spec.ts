import { expect, test } from "@playwright/test";

test("MMORPG 리소스 655종을 검색하고 WebGL 다각도로 미리 본다", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));

  await page.goto("/?mode=gallery");
  await expect(page.getByRole("heading", { name: "대륙 리소스 도감" })).toBeVisible();
  await expect(page.locator("canvas.viewport")).toBeVisible();
  await expect(page.locator(".viewport-wrap")).toHaveAttribute("data-frame", /\d+\.\d+x\d+\.\d+x\d+\.\d+@\d+\.\d+/);

  await page.getByRole("button", { name: /동물 208/ }).click();
  await expect(page.locator("#asset-list button")).toHaveCount(208);
  await page.getByPlaceholder("이름, ID, 태그").fill("비전 늑대");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await page.locator("#asset-list button").click();
  await expect(page.locator("#asset-kind")).toHaveText("FAUNA");
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-fauna-wolf-front.png") });
  const viewport = page.locator("canvas.viewport");
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) throw new Error("Gallery viewport bounds are unavailable");
  await page.mouse.move(viewportBox.x + viewportBox.width * 0.66, viewportBox.y + viewportBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + viewportBox.width * 0.34, viewportBox.y + viewportBox.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-fauna-wolf-orbit.png") });
  await page.mouse.move(viewportBox.x + viewportBox.width * 0.34, viewportBox.y + viewportBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + viewportBox.width * 0.66, viewportBox.y + viewportBox.height * 0.5, { steps: 12 });
  await page.mouse.up();

  await page.getByRole("button", { name: /몬스터 96/ }).click();
  await expect(page.locator("#asset-list button")).toHaveCount(96);
  await page.getByPlaceholder("이름, ID, 태그").fill("빙결 룬 골렘");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await page.locator("#asset-list button").click();
  await expect(page.locator("#asset-kind")).toHaveText("CREATURE");
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-creature-golem.png") });

  await page.getByRole("button", { name: /월드 100/ }).click();
  await expect(page.locator("#asset-list button")).toHaveCount(100);
  await page.getByPlaceholder("이름, ID, 태그").fill("비전 왕국 공성 발리스타");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await page.locator("#asset-list button").click();
  await expect(page.locator("#asset-kind")).toHaveText("WORLD");
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-world-ballista.png") });

  await page.getByRole("button", { name: /NPC 72/ }).click();
  await expect(page.locator("#asset-list button")).toHaveCount(72);
  await page.getByPlaceholder("이름, ID, 태그").fill("대장장이");
  await expect(page.locator("#asset-list button")).toHaveCount(3);
  await page.locator("#asset-list button").first().click();
  await expect(page.locator("#asset-kind")).toHaveText("NPC");
  await expect(page.locator("#asset-name")).toContainText("대장장이");
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-npc-blacksmith.png") });

  await page.getByRole("button", { name: /아이템 173/ }).click();
  await expect(page.locator("#asset-list button")).toHaveCount(173);
  await page.getByPlaceholder("이름, ID, 태그").fill("왕실 판금 갑옷");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await page.locator("#asset-list button").click();
  await expect(page.locator("#asset-kind")).toHaveText("ITEM · OUTFIT");
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-royal-plate.png") });

  await page.getByPlaceholder("이름, ID, 태그").fill("월광 대검");
  await expect(page.locator("#asset-list button")).toHaveCount(1);
  await page.locator("#asset-list button").click();
  await expect(page.locator("#asset-kind")).toHaveText("ITEM · WEAPON");
  await page.locator(".viewport-wrap").screenshot({ path: testInfo.outputPath("gallery-moon-greatsword.png") });

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
