import type { UserRole } from "@attendance/types";

export function isUserRole(value: unknown): value is UserRole {
  return value === "student" || value === "admin" || value === "super_admin";
}

export function isAdminRole(role: UserRole): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}

export function homeForRole(role: UserRole) {
  return role === "student" ? "/student" : "/admin";
}
