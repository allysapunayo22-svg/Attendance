import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { absenceRequestSchema, type AbsenceRequestInput } from "@attendance/validation";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SectionHeader } from "../../src/components/SectionHeader";
import { SegmentedFilter, type SegmentOption } from "../../src/components/SegmentedFilter";
import { StatusBadge } from "../../src/components/StatusBadge";
import { useEvents } from "../../src/hooks/useEvents";
import { supabase } from "../../src/services/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { formatDateTime } from "../../src/utils/format";

const requestOptions: SegmentOption<AbsenceRequestInput["requestType"]>[] = [
  { value: "absence", label: "Absence" },
  { value: "late", label: "Late" },
  { value: "correction", label: "Correction" }
];

export default function AppealScreen() {
  const params = useLocalSearchParams<{ eventId?: string; localId?: string }>();
  const student = useAuthStore((state) => state.student);
  const [submitting, setSubmitting] = useState(false);
  const [documentPathsText, setDocumentPathsText] = useState("");
  const eventsQuery = useEvents();
  const form = useForm<AbsenceRequestInput>({
    resolver: zodResolver(absenceRequestSchema),
    defaultValues: {
      eventId: params.eventId ?? "",
      requestType: "absence",
      explanation: "",
      documentPaths: []
    }
  });
  const selectedEventId = form.watch("eventId");
  const selectedType = form.watch("requestType");

  useEffect(() => {
    if (params.eventId) {
      form.setValue("eventId", params.eventId, { shouldValidate: true });
    }
  }, [form, params.eventId]);

  const requestsQuery = useQuery({
    queryKey: ["absence-requests", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from("absence_requests")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    }
  });

  const eventOptions = useMemo(() => {
    return (eventsQuery.data ?? []).slice(0, 20);
  }, [eventsQuery.data]);

  const submit = form.handleSubmit(async (values) => {
    if (!student) return;
    setSubmitting(true);
    try {
      const documentPaths = documentPathsText
        .split("\n")
        .map((path) => path.trim())
        .filter(Boolean);

      const { error } = await supabase.from("absence_requests").insert({
        student_id: student.id,
        event_id: values.eventId,
        request_type: values.requestType,
        explanation: values.explanation,
        document_paths: documentPaths,
        status: "submitted"
      });
      if (error) throw error;
      form.reset({ eventId: "", requestType: "absence", explanation: "", documentPaths: [] });
      setDocumentPathsText("");
      await requestsQuery.refetch();
      Alert.alert("Submitted", "Your request is now under review.");
    } catch (error) {
      Alert.alert("Unable to submit", error instanceof Error ? error.message : "Try again later.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-4 p-5">
      <View>
        <Text className="text-2xl font-bold text-slate-950">Absence and Appeal</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-600">Submit absence explanations, late explanations, or attendance correction requests.</Text>
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Request type</Text>
        <SegmentedFilter options={requestOptions} value={selectedType} onChange={(value) => form.setValue("requestType", value, { shouldValidate: true })} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Event</Text>
        <View className="gap-2">
          {eventOptions.map((event) => {
            const selected = event.id === selectedEventId;
            return (
              <Pressable
                key={event.id}
                onPress={() => form.setValue("eventId", event.id, { shouldValidate: true })}
                className={`rounded-lg border p-4 ${selected ? "border-brand-700 bg-brand-50" : "border-slate-200 bg-white"}`}
              >
                <Text className={`font-semibold ${selected ? "text-brand-900" : "text-slate-950"}`}>{event.title}</Text>
                <Text className="mt-1 text-sm text-slate-500">{event.schedule ? formatDateTime(event.schedule.starts_at) : "Schedule pending"}</Text>
              </Pressable>
            );
          })}
        </View>
        {form.formState.errors.eventId ? <Text className="mt-1 text-sm text-red-600">{form.formState.errors.eventId.message}</Text> : null}
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Explanation</Text>
        <Controller
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              multiline
              textAlignVertical="top"
              className="min-h-40 rounded-lg border border-slate-300 bg-white p-4 text-base"
            />
          )}
        />
        {form.formState.errors.explanation ? <Text className="mt-1 text-sm text-red-600">{form.formState.errors.explanation.message}</Text> : null}
      </View>

      <View>
        <Text className="mb-2 text-sm font-semibold text-slate-700">Supporting document paths</Text>
        <TextInput
          value={documentPathsText}
          onChangeText={setDocumentPathsText}
          multiline
          textAlignVertical="top"
          placeholder="One storage path per line"
          placeholderTextColor="#94a3b8"
          className="min-h-24 rounded-lg border border-slate-300 bg-white p-4 text-base"
        />
      </View>

      <PrimaryButton title="Submit Request" loading={submitting} onPress={submit} />

      <View className="gap-3">
        <SectionHeader title="Request Status" subtitle={`${requestsQuery.data?.length ?? 0} recent requests`} />
        {(requestsQuery.data ?? []).map((request) => (
          <View key={request.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-semibold text-slate-950">{request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} request</Text>
                <Text className="mt-1 text-sm text-slate-500">{formatDateTime(request.created_at)}</Text>
              </View>
              <StatusBadge status={request.status} />
            </View>
            <Text className="mt-2 text-sm text-slate-600" numberOfLines={2}>{request.explanation}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
