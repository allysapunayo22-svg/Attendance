"use client";

import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface AnnouncementForm {
  title: string;
  description: string;
  importance: "normal" | "important" | "urgent";
}

async function fetchAnnouncements() {
  const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["announcements-admin"], queryFn: fetchAnnouncements });
  const form = useForm<AnnouncementForm>({ defaultValues: { title: "", description: "", importance: "normal" } });

  const submit = form.handleSubmit(async (values) => {
    const { data: user } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from("admin_profiles").select("id").eq("user_id", user.user?.id).single();
    const { error } = await supabase.from("announcements").insert({
      ...values,
      created_by: admin?.id,
      publish_at: new Date().toISOString()
    });
    if (error) throw error;
    form.reset();
    await queryClient.invalidateQueries({ queryKey: ["announcements-admin"] });
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100"><h1 className="text-lg font-bold text-slate-900">Create Announcement</h1></CardHeader>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Title</span>
              <Input placeholder="Enter announcement title…" {...form.register("title", { required: true })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Description</span>
              <Textarea placeholder="Details for student mobile notification…" {...form.register("description", { required: true })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Importance</span>
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100" {...form.register("importance")}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <Button type="submit" className="h-10 w-full rounded-xl bg-brand-700 hover:bg-brand-800 text-xs font-semibold text-white shadow-xs"><Send size={15} /><span>Publish Announcement</span></Button>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900">Broadcast History</h2></CardHeader>
        <CardContent className="space-y-3 p-5">
          {(query.data ?? []).map((announcement) => (
            <div key={announcement.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-blue-50/20">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={announcement.importance}>{announcement.importance}</Badge>
                <span className="text-xs text-slate-400">{new Date(announcement.publish_at).toLocaleString()}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{announcement.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{announcement.description}</p>
            </div>
          ))}
          {!query.isLoading && !query.data?.length ? (
            <div className="p-8 text-center text-sm text-slate-500">No announcements broadcasted yet.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
