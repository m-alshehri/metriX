import { test, expect } from "@playwright/test";
test("Arabic sign-in, sign-up navigation and protected dashboard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/ar/login");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("input[name=email]")).toBeVisible();
  await page.getByRole("link", { name: "إنشاء حساب" }).click();
  await expect(page).toHaveURL(/\/ar\/signup$/);
  await page.goto("/ar/dashboard");
  await expect(page).toHaveURL(/\/ar\/login/);
  expect(errors).toEqual([]);
});
test("legacy login redirects", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/en\/login$/);
});
test("privileged endpoints reject anonymous requests", async ({ request }) => {
  expect((await request.get("/api/cron/metrix-pipeline")).status()).toBe(401);
  expect(
    (
      await request.get(
        "/api/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/jobs",
      )
    ).status(),
  ).toBe(401);
  expect((await request.get("/api/oauth/status")).status()).toBe(410);
});
