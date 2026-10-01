"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { EventStatus } from "@attendance/types";
import { eventFormSchema, type EventFormInput } from "@attendance/validation";
import { supabase } from "@/lib/supabase";
import { defaultEventFormValues, EventWizardForm } from "./EventWizardForm";
import { eventSaveErrorMessage, toEventTimestamp } from "@/lib/event-form";

const statusOptions: EventStatus[] = ["draft", "published", "ongoing", "completed", "cancelled"];

function timeValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toTimeString().slice(0, 5);
}

function dateValue(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function dateTimeLocalValue(value?: string | null) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 16);
}

function isCoordinate(value: unknown): value is { latitude: number | string; longitude: number | string } {
  return Boolean(value && typeof value === "object" && "latitude" in value && "longitude" in value);
}

function polygonCoordinatesFromGeojson(geojson: unknown) {
  if (!geojson || typeof geojson !== "object" || !("coordinates" in geojson)) {
    return [];
  }

  const coordinates = (geojson as { coordinates?: unknown }).coordinates;

  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .filter(isCoordinate)
    .map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude)
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
}

export function EventEditForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [eventStatus, setEventStatus] = useState<EventStatus>("draft");
  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      ...defaultEventFormValues,
      notificationSchedule: []
    }
  });

  useEffect(() => {
    supabase
      .from("events")
      .select("*, schedule:event_schedules(*), location:event_locations(*), participants:event_participants(*), zones:event_zones(*)")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (!data) return;

        const firstZone = (data.zones ?? [])[0];
        const polygonCoordinates = firstZone?.zone_type === "polygon" ? polygonCoordinatesFromGeojson(firstZone.geojson) : [];

        setEventStatus(data.status as EventStatus);
        form.reset({
          ...defaultEventFormValues,
          title: data.title,
          description: data.description,
          type: data.type,
          requirement: data.requirement,
          eventDate: dateValue(data.schedule?.starts_at),
          startsAt: timeValue(data.schedule?.starts_at),
          endsAt: timeValue(data.schedule?.ends_at),
          checkInOpensAt: timeValue(data.schedule?.check_in_opens_at),
          checkInClosesAt: timeValue(data.schedule?.check_in_closes_at),
          lateEndsAt: timeValue(data.schedule?.late_ends_at),
          checkOutOpensAt: timeValue(data.schedule?.check_out_opens_at),
          checkOutClosesAt: timeValue(data.schedule?.check_out_closes_at),
          venueName: data.location?.venue_name ?? "",
          address: data.location?.address ?? "",
          latitude: data.location?.latitude ?? 14.5995,
          longitude: data.location?.longitude ?? 120.9842,
          radiusMeters: data.location?.radius_meters ?? 100,
          requiredGpsAccuracyMeters: data.location?.required_gps_accuracy_meters ?? 40,
          zoneMode: polygonCoordinates.length >= 3 ? "polygon" : "circle",
          zones:
            polygonCoordinates.length >= 3
              ? [
                  {
                    name: firstZone?.name ?? "Polygon zone",
                    zoneType: "polygon",
                    radiusMeters: null,
                    coordinates: polygonCoordinates
                  }
                ]
              : [],
          photoRequired: data.photo_required,
          timeOutPhotoRequired: data.time_out_photo_required,
          dynamicQrRequired: data.dynamic_qr_required,
          minimumAttendanceMinutes: data.minimum_attendance_minutes,
          assignedCourseIds: [],
          assignedSectionIds: [],
          assignedYearLevels: (data.participants ?? [])
            .filter((participant: { target_type: string; year_level: number | null }) => participant.target_type === "year_level" && participant.year_level)
            .map((participant: { year_level: number }) => participant.year_level)
            .filter((yearLevel: number) => yearLevel >= 1 && yearLevel <= 4),
          maxParticipants: data.max_participants,
          registrationDeadline: dateTimeLocalValue(data.registration_deadline),
          notificationSchedule: Array.isArray(data.notification_schedule) ? data.notification_schedule : []
        });
      });
  }, [eventId, form]);

  const saveEvent: SubmitHandler<EventFormInput> = async (values) => {
    const { error: eventError } = await supabase
      .from("events")
      .update({
        title: values.title,
        description: values.description,
        type: values.type,
        requirement: values.requirement,
        photo_required: values.photoRequired,
        time_out_photo_required: values.timeOutPhotoRequired,
        dynamic_qr_required: values.dynamicQrRequired,
        minimum_attendance_minutes: values.minimumAttendanceMinutes,
        max_participants: values.maxParticipants,
        registration_deadline: values.registrationDeadline,
        notification_schedule: values.notificationSchedule,
        status: eventStatus
      })
      .eq("id", eventId);

    if (eventError) throw eventError;

    const { error: scheduleError } = await supabase
      .from("event_schedules")
      .update({
        event_date: values.eventDate,
        starts_at: toEventTimestamp(values.eventDate, values.startsAt),
        ends_at: toEventTimestamp(values.eventDate, values.endsAt),
        check_in_opens_at: toEventTimestamp(values.eventDate, values.checkInOpensAt),
        check_in_closes_at: toEventTimestamp(values.eventDate, values.checkInClosesAt),
        late_ends_at: values.lateEndsAt ? toEventTimestamp(values.eventDate, values.lateEndsAt) : null,
        check_out_opens_at: values.checkOutOpensAt ? toEventTimestamp(values.eventDate, values.checkOutOpensAt) : null,
        check_out_closes_at: values.checkOutClosesAt ? toEventTimestamp(values.eventDate, values.checkOutClosesAt) : null
      })
      .eq("event_id", eventId);

    if (scheduleError) throw new Error(`Unable to save the event schedule: ${eventSaveErrorMessage(scheduleError)}`);

    const { error: locationError } = await supabase
      .from("event_locations")
      .update({
        venue_name: values.venueName,
        address: values.address,
        latitude: values.latitude,
        longitude: values.longitude,
        radius_meters: values.radiusMeters,
        required_gps_accuracy_meters: values.requiredGpsAccuracyMeters
      })
      .eq("event_id", eventId);

    if (locationError) throw locationError;

    const { error: deleteZonesError } = await supabase.from("event_zones").delete().eq("event_id", eventId);
    if (deleteZonesError) throw deleteZonesError;

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

    const { error: deleteParticipantsError } = await supabase.from("event_participants").delete().eq("event_id", eventId);
    if (deleteParticipantsError) throw deleteParticipantsError;

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

    const { error: auditError } = await supabase.rpc("log_audit", {
      p_action: "event.updated",
      p_entity_type: "event",
      p_entity_id: eventId,
      p_metadata: { title: values.title, status: eventStatus }
    });

    if (auditError) throw auditError;

    router.push("/events?saved=updated");
  };

  const statusControl = (
    <label>
      <span className="mb-2 block text-sm font-semibold">Status</span>
      <select
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        value={eventStatus}
        onChange={(event) => setEventStatus(event.target.value as EventStatus)}
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <EventWizardForm
      form={form}
      onValidSubmit={saveEvent}
      submitLabel="Save Changes"
      submittingLabel="Saving"
      reviewTitle="Review before saving"
      statusControl={statusControl}
    />
  );
}
