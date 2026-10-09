import assert from "node:assert/strict";
import { test } from "node:test";
import { homeForRole, isAdminRole, isUserRole } from "../lib/auth/roles.ts";

test("all existing database roles are recognized", () => {
  for (const role of ["student", "admin", "super_admin"]) assert.equal(isUserRole(role), true);
  for (const role of [undefined, null, "", "teacher", "superadmin"]) assert.equal(isUserRole(role), false);
});

test("admin and super admin share the admin authorization boundary", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("super_admin"), true);
  assert.equal(isAdminRole("student"), false);
});

test("trusted roles resolve to their correct application home", () => {
  assert.equal(homeForRole("admin"), "/admin");
  assert.equal(homeForRole("super_admin"), "/admin");
  assert.equal(homeForRole("student"), "/student");
});
