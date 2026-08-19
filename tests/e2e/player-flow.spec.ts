import { expect, test } from "@playwright/test";

test("전사 생성부터 장비 교체, 공격, 저장 복원까지 이어진다", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));

  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.locator(".lobby-actions [data-action='create']").click();
  await page.locator("[data-body='feminine']").click();
  await page.locator("[data-class-id='warrior']").click();
  await page.locator("input[name='characterName']").fill("검증전사");
  await page.locator("button[type='submit']").click();

  await expect(page.locator("#app")).toHaveAttribute("data-app-mode", "selection");
  await expect(page.locator(".selected-character-name")).toHaveText("검증전사");
  await page.locator("[data-action='enter']").click();
  const field = page.locator(".field-shell");
  await expect(field).toHaveAttribute("data-animation", "idle");
  await expect(field).toHaveAttribute("data-field-size", "240");
  await expect(field).toHaveAttribute("data-avatar-scale", "0.36");
  await expect(field).toHaveAttribute("data-camera-fov", "52");

  const startZ = Number(await field.getAttribute("data-player-z"));
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyW");
  await expect.poll(async () => Number(await field.getAttribute("data-player-z"))).not.toBe(startZ);

  await page.keyboard.press("KeyI");
  await expect(page.locator(".inventory-overlay")).toBeVisible();
  await page.locator("[data-item-id='weapon.moon-sword']").click();
  await page.locator("[data-item-id='outfit.traveler']").click();
  await page.locator("[data-item-id='head.starter-cap']").click();
  await expect(page.locator("[data-item-id='weapon.moon-sword']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-item-id='outfit.traveler']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-item-id='head.starter-cap']")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(80);
  await page.keyboard.press("KeyF");
  await expect(field).toHaveAttribute("data-attack-count", "1");
  await expect(field).toHaveAttribute("data-animation", "attack_1");
  await expect.poll(async () => field.getAttribute("data-animation")).toBe("run");
  await page.keyboard.up("KeyW");

  await page.reload();
  await expect(page.locator(".selected-character-name")).toHaveText("검증전사");
  await expect(page.locator(".spec-weapon")).toHaveText("달빛 검");
  await page.locator("[data-action='enter']").click();
  await page.keyboard.press("KeyI");
  await expect(page.locator("[data-item-id='weapon.moon-sword']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-item-id='outfit.traveler']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-item-id='head.starter-cap']")).toHaveAttribute("aria-pressed", "true");

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
