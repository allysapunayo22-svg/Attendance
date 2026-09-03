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
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader><h1 className="text-xl font-bold">Create Announcement</h1></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Title</span>
              <Input {...form.register("title", { required: true })} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Description</span>
              <Textarea {...form.register("description", { required: true })} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Importance</span>
              <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...form.register("importance")}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <Button type="submit"><Send size={16} />Publish</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-xl font-bold">Announcement Management</h2></CardHeader>
        <CardContent className="space-y-3">
          {(query.data ?? []).map((announcement) => (
            <div key={announcement.id} className="rounded-md border border-slate-200 p-4">
              <Badge tone={announcement.importance}>{announcement.importance}</Badge>
              <h3 className="mt-3 font-bold text-slate-950">{announcement.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{announcement.description}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(announcement.publish_at).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
