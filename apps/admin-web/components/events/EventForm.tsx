"use client";

import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, type EventFormInput } from "@attendance/validation";
import { supabase } from "@/lib/supabase";
import { defaultEventFormValues, EventWizardForm } from "./EventWizardForm";
import { completeEventCreation, eventSaveErrorMessage, toEventTimestamp } from "@/lib/event-form";

export function EventForm() {
  const router = useRouter();
  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultEventFormValues
  });

  const createEvent: SubmitHandler<EventFormInput> = async (values) => {
    const { data: adminUser } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from("admin_profiles").select("id").eq("user_id", adminUser.user?.id).single();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title: values.title,
        description: values.description,
        type: values.type,
        requirement: values.requirement,
        status: "draft",
        photo_required: values.photoRequired,
        time_out_photo_required: values.timeOutPhotoRequired,
        dynamic_qr_required: values.dynamicQrRequired,
        minimum_attendance_minutes: values.minimumAttendanceMinutes,
        max_participants: values.maxParticipants,
        registration_deadline: values.registrationDeadline,
        notification_schedule: values.notificationSchedule,
        created_by: admin?.id
      })
      .select("id")
      .single();

    if (eventError) throw eventError;

    const eventId = event.id as string;
    await completeEventCreation(async () => {
      const [schedule, location] = await Promise.all([
        supabase.from("event_schedules").insert({
          event_id: eventId,
          event_date: values.eventDate,
          starts_at: toEventTimestamp(values.eventDate, values.startsAt),
          ends_at: toEventTimestamp(values.eventDate, values.endsAt),
          check_in_opens_at: toEventTimestamp(values.eventDate, values.checkInOpensAt),
          check_in_closes_at: toEventTimestamp(values.eventDate, values.checkInClosesAt),
          late_ends_at: values.lateEndsAt ? toEventTimestamp(values.eventDate, values.lateEndsAt) : null,
          check_out_opens_at: values.checkOutOpensAt ? toEventTimestamp(values.eventDate, values.checkOutOpensAt) : null,
          check_out_closes_at: values.checkOutClosesAt ? toEventTimestamp(values.eventDate, values.checkOutClosesAt) : null
        }),
        supabase.from("event_locations").insert({
          event_id: eventId,
          venue_name: values.venueName,
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
          radius_meters: values.radiusMeters,
          required_gps_accuracy_meters: values.requiredGpsAccuracyMeters
        })
      ]);

      if (schedule.error) throw new Error(`Unable to save the event schedule: ${eventSaveErrorMessage(schedule.error)}`);
      if (location.error) throw location.error;

      const polygonZone = values.zones[0];
      if (values.zoneMode === "polygon" && polygonZone && polygonZone.coordinates.length >= 3) {
        const { error } = await supabase.rpc("create_polygon_event_zone", {
          p_event_id: eventId,
          p_name: polygonZone.name,
          p_coordinates: polygonZone.coordinates
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from("event_zones").insert({
          event_id: eventId,
          name: "Main radius",
          zone_type: "circle",
          center_latitude: values.latitude,
          center_longitude: values.longitude,
          radius_meters: values.radiusMeters,
          geojson: {
            type: "circle",
            center: [values.longitude, values.latitude],
            radiusMeters: values.radiusMeters
          }
        });

        if (error) throw error;
      }

      if (values.assignedYearLevels.length > 0) {
        const { error } = await supabase.from("event_participants").insert(
          values.assignedYearLevels.map((yearLevel) => ({
            event_id: eventId,
            target_type: "year_level",
            year_level: yearLevel
          }))
        );

        if (error) throw error;
      }

    }, async () => {
      const { data: removed, error } = await supabase.from("events").delete().eq("id", eventId).eq("status", "draft").select("id");
      if (error || !removed?.length) throw error ?? new Error("Draft cleanup failed.");
    });

    router.push("/admin/events?saved=created");
  };

  return (
    <EventWizardForm
      form={form}
      onValidSubmit={createEvent}
      submitLabel="Create Event"
      submittingLabel="Saving"
      reviewTitle="Review before creating"
    />
  );
}
