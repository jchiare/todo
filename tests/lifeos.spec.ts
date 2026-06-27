import { test, expect, type Page } from "@playwright/test";

// Each test gets a fresh browser context, so localStorage starts empty and the
// app boots from the default seed every time.

const RANKED_TITLES = [
  "Do 20 Anki cards + 1 Nicos Weg lesson.",
  "Collect W-2, 1099, RSU, and childcare documents.",
  "Find one German-speaking babysitter option.",
];

const GATED_IN_QUIET = [
  "Berlin Housing",
  "Schools",
  "Safety",
  "N-400 / Citizenship",
  "Career / Income Optionality",
];

async function gotoToday(page: Page) {
  await page.goto("/");
  await page.waitForSelector("article");
}

const card = (page: Page, i: number) => page.locator("article").nth(i);

test.describe("Today", () => {
  test("ranks the seed into three cards in the expected order", async ({ page }) => {
    await gotoToday(page);
    await expect(page.locator("article")).toHaveCount(3);
    await expect(page.locator("article h3")).toHaveText(RANKED_TITLES);
  });

  test("nav badges reflect live (3) and project (8) counts", async ({ page }) => {
    await gotoToday(page);
    const navButtons = page.locator("nav button");
    await expect(navButtons.nth(0)).toContainText("Today");
    await expect(navButtons.nth(0)).toContainText("3");
    await expect(navButtons.nth(1)).toContainText("Projects");
    await expect(navButtons.nth(1)).toContainText("8");
  });

  test("gated projects fall into Quiet today with reasons", async ({ page }) => {
    await gotoToday(page);
    const body = page.locator("body");
    // "Quiet today" is an uppercased eyebrow; match case-insensitively.
    await expect(body).toContainText(/quiet today/i);
    for (const title of GATED_IN_QUIET) {
      await expect(body).toContainText(title);
    }
    await expect(body).toContainText("No change requiring action.");
    await expect(body).toContainText("No eligibility or early-filing window is near.");
  });

  test("'Why this rank' reveals the deterministic breakdown totalling 64", async ({
    page,
  }) => {
    await gotoToday(page);
    const first = card(page, 0);
    await first.getByText("Why this rank ▸").click();
    await expect(first).toContainText("Deadline urgency");
    await expect(first).toContainText("Momentum risk (3d untouched)");
    // The Score row's value sits in the trailing cell.
    const scoreRow = first.locator("div", { hasText: /^Score/ }).last();
    await expect(scoreRow).toContainText("64");
  });

  test("Start → Mark done moves the action to Completed, Undo restores it", async ({
    page,
  }) => {
    await gotoToday(page);
    const first = card(page, 0);
    await first.getByRole("button", { name: "Start" }).click();
    await expect(first.getByRole("button", { name: "Mark done" })).toBeVisible();
    await first.getByRole("button", { name: "Mark done" }).click();

    await expect(page.locator("body")).toContainText(/completed today/i);
    await expect(page.locator("body")).toContainText("Habit done — returns tomorrow.");
    await expect(page.locator("article")).toHaveCount(2);

    await page.getByRole("button", { name: "Undo" }).first().click();
    await expect(page.locator("article")).toHaveCount(3);
  });

  test("Snooze removes the card and shows a Quiet reason", async ({ page }) => {
    await gotoToday(page);
    await card(page, 0).getByRole("button", { name: "Snooze" }).click();
    await expect(page.locator("article")).toHaveCount(2);
    await expect(page.locator("body")).toContainText("Snoozed. Returns tomorrow.");
  });

  test("Break Down reveals the inline steps", async ({ page }) => {
    await gotoToday(page);
    const first = card(page, 0);
    await first.getByRole("button", { name: "Break Down" }).click();
    await expect(first).toContainText(/broken down/i);
    await expect(first).toContainText("Open Anki and clear the 20 due cards");
  });

  test("state persists across a reload", async ({ page }) => {
    await gotoToday(page);
    await card(page, 0).getByRole("button", { name: "Snooze" }).click();
    await expect(page.locator("article")).toHaveCount(2);
    await page.reload();
    await page.waitForSelector("article");
    await expect(page.locator("article")).toHaveCount(2);
  });
});

test.describe("Projects", () => {
  test("lists all eight projects", async ({ page }) => {
    await gotoToday(page);
    await page.locator("nav button", { hasText: "Projects" }).click();
    await expect(page.locator("body")).toContainText(/the memory/i);
    await expect(page.getByRole("button", { name: "Open" })).toHaveCount(8);
  });

  test("new-project form validates, then creates and surfaces the project", async ({
    page,
  }) => {
    await gotoToday(page);
    await page.locator("nav button", { hasText: "Projects" }).click();
    await page.getByRole("button", { name: "+ New project" }).click();

    // Empty submit shows the inline validation message.
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.locator("body")).toContainText("Add a title and a next action.");

    await page.getByPlaceholder("e.g. Learn German A1").fill("Test Project X");
    await page
      .getByPlaceholder("The single best concrete step")
      .fill("Do the first concrete step");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("button", { name: "Open" })).toHaveCount(9);

    // The new project also enters the Today ranking immediately.
    await page.locator("nav button", { hasText: "Today" }).click();
    await expect(page.locator("body")).toContainText("Do the first concrete step");
  });

  test("detail shows tabs, facts strip, and the looked-up related decision", async ({
    page,
  }) => {
    await gotoToday(page);
    await page.locator("nav button", { hasText: "Projects" }).click();
    await page.getByRole("button", { name: "Open" }).first().click();

    await expect(page.getByRole("button", { name: "Overview", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tasks", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sources", exact: true })).toBeVisible();
    await expect(page.locator("body")).toContainText(/current memo/i);
    await expect(page.locator("body")).toContainText(/review cadence/i);
    await expect(page.locator("body")).toContainText(
      "Berlin 2027 vs Berlin 2028 vs Stay USA"
    );
  });

  test("task research rolls up into a synthesized memo", async ({ page }) => {
    await gotoToday(page);
    await page.locator("nav button", { hasText: "Projects" }).click();
    await page.getByRole("button", { name: "Open" }).first().click();

    // Tasks tab: open the first task and add a finding.
    await page.getByRole("button", { name: "Tasks", exact: true }).click();
    await page.getByRole("button", { name: "20 Anki cards daily" }).click();
    await page
      .getByPlaceholder("Add a finding — one clear statement")
      .fill("Deck aligned to A1 frequency list");
    await page.getByRole("button", { name: "Add finding" }).click();
    await expect(page.locator("body")).toContainText("1 finding");

    // Overview tab: summarize synthesizes the finding into the memo.
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await page.getByRole("button", { name: /Summarize from research/ }).click();
    await expect(page.locator("body")).toContainText("Synthesized from 1 finding");
    await expect(page.locator("body")).toContainText(
      "Research now supports 1 finding: Deck aligned to A1 frequency list."
    );
  });
});
