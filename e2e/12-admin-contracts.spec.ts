import { test, expect } from "@playwright/test";
import { stubCommon, seedAuth, adminUser } from "./fixtures";

// Verifies the contract-management unification: an Admin on the partner detail
// page sees the docx contract UI + placeholder cheat-sheet, and the request
// carries ?supplierId= (white-glove for any partner).
test("admin partner contracts tab: docx UI + placeholders, scoped to the partner", async ({ page }) => {
  const SUP = "test-sup-1";
  await seedAuth(page, adminUser);
  await stubCommon(page);

  // supplier detail (supplierService.getById -> GET /admin/suppliers/{id})
  await page.route(new RegExp(`/admin/suppliers/${SUP}$`), (r) =>
    r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        id: SUP, name: "Acme Storage", isActive: true, isVerified: true,
        integrationType: "manual", tier: "standard", billingModel: "marketplace",
        partnerDiscountRate: 0, clientDiscountRate: 0,
      }),
    }));
  await page.route(/\/admin\/suppliers\/[^/]+\/contracts/, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));

  // the docx system endpoint — capture the URL to assert the supplierId is sent
  let ctUrl = "";
  await page.route(/\/provider\/contract-template/, (r) => {
    ctUrl = r.request().url();
    r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        templates: [], activeId: null,
        vocabulary: [
          { token: "{{tenant_name}}", label: "Tenant full name" },
          { token: "{{start_date}}", label: "Start date" },
        ],
      }),
    });
  });

  await page.goto(`/et/admin/partners/${SUP}?tab=contracts`);

  // The placeholder cheat-sheet (which the founder reported as missing) now renders:
  await expect(page.getByText("{{tenant_name}}").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("{{start_date}}").first()).toBeVisible();

  // And the request was scoped to THIS partner (white-glove for any supplier):
  expect(ctUrl).toContain(`supplierId=${SUP}`);
});
