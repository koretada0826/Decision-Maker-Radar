import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";
import type { Role } from "./supabase/types";

export type SessionContext = {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  organizationName: string;
};

export async function getSession(): Promise<SessionContext | null> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 所属が複数ある場合は先頭。MVPでは1ユーザー1組織を想定。
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!member) {
    return {
      userId: user.id,
      email: user.email ?? "",
      organizationId: "",
      role: "rep",
      organizationName: "",
    };
  }

  const orgName =
    (member as { organizations?: { name?: string } | null }).organizations
      ?.name ?? "";

  return {
    userId: user.id,
    email: user.email ?? "",
    organizationId: member.organization_id,
    role: member.role as Role,
    organizationName: orgName,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireOnboarded(): Promise<SessionContext> {
  const s = await requireSession();
  if (!s.organizationId) redirect("/onboarding");
  return s;
}

export function hasRole(s: SessionContext, roles: Role[]) {
  return roles.includes(s.role);
}
