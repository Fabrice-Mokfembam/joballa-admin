import {
  ADMIN_ROUTE_RULES,
  getRouteRule,
  isProtectedAdminRoute,
  isPublicAdminRoute,
} from "@/lib/auth/route-config";

describe("admin route-config", () => {
  it("marks login as public", () => {
    expect(isPublicAdminRoute("/admin/login")).toBe(true);
    expect(isProtectedAdminRoute("/admin/login")).toBe(false);
  });

  it("protects kyc route", () => {
    expect(isProtectedAdminRoute("/admin/kyc")).toBe(true);
    expect(getRouteRule("/admin/kyc")?.permission).toBe("verify_kyc");
  });

  it("matches nested document routes", () => {
    const rule = getRouteRule("/admin/documents/abc-123");
    expect(rule?.permission).toBe("verify_documents");
  });

  it("uses longest prefix match for jobs vs verified-jobs", () => {
    expect(getRouteRule("/admin/verified-jobs")?.permission).toBe("manage_jobs");
    expect(getRouteRule("/admin/jobs")?.permission).toBe("verify_jobs");
  });

  it("dashboard rule has no extra permission", () => {
    const rule = getRouteRule("/admin");
    expect(rule?.prefix).toBe("/admin");
    expect(rule?.permission).toBeUndefined();
  });

  it("covers every configured sidebar module", () => {
    const prefixes = ADMIN_ROUTE_RULES.map((r) => r.prefix);
    expect(prefixes).toEqual(
      expect.arrayContaining([
        "/admin/login",
        "/admin/kyc",
        "/admin/users",
        "/admin/admins",
      ]),
    );
  });
});
