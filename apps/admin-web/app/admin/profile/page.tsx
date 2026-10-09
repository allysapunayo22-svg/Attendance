"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

async function fetchAdminProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("No authenticated administrator.");
  const { data, error } = await supabase.from("admin_profiles").select("full_name,email,permissions,created_at").eq("user_id", userData.user.id).maybeSingle();
  if (error) throw error;
  return {
    fullName: data?.full_name || userData.user.user_metadata?.full_name || "System Admin",
    email: data?.email || userData.user.email || "Not available",
    permissions: data?.permissions ?? [],
    createdAt: data?.created_at ?? userData.user.created_at
  };
}

export default function ProfilePage() {
  const query = useQuery({ queryKey: ["admin-profile"], queryFn: fetchAdminProfile });
  const profile = query.data;
  const initials = profile?.fullName.split(/\s+/).map((part: string) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "AD";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Profile</h1><p className="mt-1 text-sm text-slate-500">Your administrator account and access details.</p></div>
      {query.isError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Profile information could not be loaded. <button className="font-semibold underline" onClick={() => void query.refetch()}>Try again</button></div> : null}
      <Card className="overflow-hidden rounded-2xl border-slate-200/90 shadow-xs">
        <CardHeader className="bg-gradient-to-r from-slate-950 to-slate-800 p-6 text-white"><div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-lg font-bold ring-4 ring-white/10">{initials}</span><div><h2 className="text-xl font-bold">{query.isLoading ? "Loading…" : profile?.fullName}</h2><p className="mt-1 text-sm text-slate-300">System Administrator</p></div></div></CardHeader>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <ProfileDetail icon={UserRound} label="Full name" value={profile?.fullName ?? "—"} />
          <ProfileDetail icon={Mail} label="Email address" value={profile?.email ?? "—"} />
          <ProfileDetail icon={ShieldCheck} label="Role" value="System Administrator" />
          <ProfileDetail icon={ShieldCheck} label="Access" value={profile?.permissions.length ? profile.permissions.map((permission: string) => permission.replace(/:/g, " ")).join(", ") : "Standard administrator access"} />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileDetail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-xs"><Icon size={18} /></span><div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p></div></div>;
}
