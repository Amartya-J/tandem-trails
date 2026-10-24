import { expect, test } from "@playwright/test";

test("a player can choose an explorer and create a room", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Tandem Trails" })).toBeVisible();
  await page.getByLabel("YOUR NAME").fill("Browser Scout");
  await page.getByRole("radio", { name: "ECHO" }).click();
  await expect(page.getByRole("radio", { name: "ECHO" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /CREATE A ROOM/ }).click();

  await expect(page.getByText("YOUR ROOM")).toBeVisible();
  await expect(page.locator(".room-code")).toHaveText(/^[A-Z0-9]{6}$/);
  await expect(page.getByText("Browser Scout")).toBeVisible();
});
