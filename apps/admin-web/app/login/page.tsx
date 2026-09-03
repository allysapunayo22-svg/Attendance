"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: values.identifier,
      password: values.password
    });
    if (authError || !data.user) {
      setError(authError?.message ?? "Login failed.");
      return;
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      await supabase.auth.signOut();
      setError("Administrator access required.");
      return;
    }

    router.replace("/");
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-slate-950">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage events and attendance verification.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <Input type="email" {...form.register("identifier")} />
              {form.formState.errors.identifier ? <span className="mt-1 block text-sm text-red-600">{form.formState.errors.identifier.message}</span> : null}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password ? <span className="mt-1 block text-sm text-red-600">{form.formState.errors.password.message}</span> : null}
            </label>
            {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in" : "Log In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
