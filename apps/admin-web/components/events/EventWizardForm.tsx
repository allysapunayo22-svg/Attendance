"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Controller, type SubmitHandler, type UseFormReturn } from "react-hook-form";
import {
  CalendarClock,
  Check,
  ClipboardList,
  MapPin,
  Save,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";
import type { EventFormInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(() => import("./LocationPicker").then((module) => module.LocationPicker), { ssr: false });

export const defaultEventFormValues: EventFormInput = {
  title: "",
  description: "",
  type: "school_event",
  requirement: "required",
  eventDate: new Date().toISOString().slice(0, 10),
  startsAt: "09:00",
  endsAt: "12:00",
  checkInOpensAt: "08:30",
  checkInClosesAt: "09:30",
  lateEndsAt: "10:00",
  checkOutOpensAt: "11:30",
  checkOutClosesAt: "12:30",
  venueName: "",
  address: "",
  latitude: 14.5995,
  longitude: 120.9842,
  radiusMeters: 100,
  requiredGpsAccuracyMeters: 40,
  zoneMode: "circle",
  zones: [],
  photoRequired: true,
  timeOutPhotoRequired: true,
  dynamicQrRequired: false,
  minimumAttendanceMinutes: 60,
  assignedCourseIds: [],
  assignedSectionIds: [],
  assignedYearLevels: [],
  maxParticipants: null,
  registrationDeadline: null,
  notificationSchedule: ["24h_before", "1h_before"]
};

const timeFields = [
  "startsAt",
  "endsAt",
  "checkInOpensAt",
  "checkInClosesAt",
  "lateEndsAt",
  "checkOutOpensAt",
  "checkOutClosesAt"
] as const;

const timeFieldLabels: Record<(typeof timeFields)[number], string> = {
  startsAt: "Start time",
  endsAt: "End time",
  checkInOpensAt: "Check-in opens",
  checkInClosesAt: "Check-in closes",
  lateEndsAt: "Late period ends",
  checkOutOpensAt: "Check-out opens",
  checkOutClosesAt: "Check-out closes"
};

type EventFormField = keyof EventFormInput;
type WizardStepKey = "details" | "schedule" | "location" | "verification" | "assignment";

type WizardStep = {
  key: WizardStepKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  fields: EventFormField[];
};

const wizardSteps: WizardStep[] = [
  {
    key: "details",
    title: "Event Details",
    shortTitle: "Details",
    description: "Set the event name, description, and requirement.",
    icon: ClipboardList,
    fields: ["title", "description", "type", "requirement"]
  },
  {
    key: "schedule",
    title: "Schedule",
    shortTitle: "Schedule",
    description: "Define the event and attendance time windows.",
    icon: CalendarClock,
    fields: ["eventDate", ...timeFields]
  },
  {
    key: "location",
    title: "Location and Zone",
    shortTitle: "Location",
    description: "Choose the venue, radius, GPS accuracy, and zone.",
    icon: MapPin,
    fields: ["venueName", "address", "latitude", "longitude", "radiusMeters", "requiredGpsAccuracyMeters", "zoneMode", "zones"]
  },
  {
    key: "verification",
    title: "Verification Rules",
    shortTitle: "Verify",
    description: "Choose photo, QR, and minimum duration rules.",
    icon: ShieldCheck,
    fields: ["photoRequired", "timeOutPhotoRequired", "dynamicQrRequired", "minimumAttendanceMinutes"]
  },
  {
    key: "assignment",
    title: "Assignment and Review",
    shortTitle: "Review",
    description: "Assign students, schedule reminders, then save.",
    icon: Users,
    fields: ["assignedYearLevels", "maxParticipants", "registrationDeadline", "notificationSchedule"]
  }
];

const yearLevelOptions = [1, 2, 3, 4];

const notificationOptions = [
  { value: "24h_before", label: "24 hours before" },
  { value: "1h_before", label: "1 hour before" },
  { value: "check_in_open", label: "When check-in opens" },
  { value: "check_out_reminder", label: "Check-out reminder" }
];

const reviewCards: Array<{
  key: string;
  label: string;
  step: WizardStepKey;
  value: (values: EventFormInput) => string;
}> = [
  {
    key: "event",
    label: "Event",
    step: "details",
    value: (values) => values.title || "Untitled event"
  },
  {
    key: "schedule",
    label: "Schedule",
    step: "schedule",
    value: (values) => `${values.eventDate} - ${values.startsAt} to ${values.endsAt}`
  },
  {
    key: "location",
    label: "Location",
    step: "location",
    value: (values) => `${values.venueName || "No venue yet"} - ${values.radiusMeters}m radius`
  },
  {
    key: "audience",
    label: "Audience",
    step: "assignment",
    value: (values) => `${values.assignedYearLevels.length ? `Year ${values.assignedYearLevels.join(", ")}` : "All active students"} - ${values.requirement}`
  },
  {
    key: "evidence",
    label: "Evidence",
    step: "verification",
    value: (values) => (values.photoRequired ? "Live photo required" : "Photo optional")
  },
  {
    key: "qr",
    label: "QR",
    step: "verification",
    value: (values) => (values.dynamicQrRequired ? "Dynamic QR required" : "Dynamic QR not required")
  }
];

export function toEventTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function stepIndexFor(stepKey: WizardStepKey) {
  const index = wizardSteps.findIndex((step) => step.key === stepKey);
  return index >= 0 ? index : 0;
}

interface EventWizardFormProps {
  form: UseFormReturn<EventFormInput>;
  onValidSubmit: SubmitHandler<EventFormInput>;
  submitLabel: string;
  submittingLabel?: string;
  reviewTitle: string;
  statusControl?: ReactNode;
  successMessage?: string;
}

export function EventWizardForm({
  form,
  onValidSubmit,
  submitLabel,
  submittingLabel = "Saving",
  reviewTitle,
  statusControl,
  successMessage
}: EventWizardFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [reviewErrorStepIndexes, setReviewErrorStepIndexes] = useState<number[]>([]);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false);

  const currentStep = wizardSteps[stepIndex] ?? wizardSteps[0]!;
  const isFinalStep = stepIndex === wizardSteps.length - 1;
  const progressPercent = Math.round(((stepIndex + 1) / wizardSteps.length) * 100);
  const values = form.watch();
  const latitude = form.watch("latitude");
  const longitude = form.watch("longitude");
  const radius = form.watch("radiusMeters");
  const zoneMode = form.watch("zoneMode");
  const polygonPoints = form.watch("zones")[0]?.coordinates ?? [];

  function applyPreset(preset: "standard" | "seminar" | "secure") {
    const presetValues = preset === "seminar"
      ? { minimumAttendanceMinutes: 30, photoRequired: true, timeOutPhotoRequired: false, dynamicQrRequired: false, radiusMeters: 100 }
      : preset === "secure"
        ? { minimumAttendanceMinutes: 60, photoRequired: true, timeOutPhotoRequired: true, dynamicQrRequired: true, radiusMeters: 75 }
        : { minimumAttendanceMinutes: 60, photoRequired: true, timeOutPhotoRequired: true, dynamicQrRequired: false, radiusMeters: 100 };
    Object.entries(presetValues).forEach(([field, value]) => form.setValue(field as EventFormField, value as never, { shouldDirty: true }));
  }

  const goNext = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setReviewErrorStepIndexes([]);
    const isStepValid = await form.trigger(currentStep.fields, { shouldFocus: true });

    if (!isStepValid) {
      return;
    }

    setStepIndex((current) => Math.min(current + 1, wizardSteps.length - 1));
  };

  const submit = form.handleSubmit(
    async (submitValues) => {
      setSubmitError(null);
      setSubmitSuccess(null);
      setReviewErrorStepIndexes([]);

      try {
        await onValidSubmit(submitValues);
        setSubmitSuccess(successMessage ?? null);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Unable to save this event. Please try again.");
      }
    },
    (errors) => {
      const invalidStepIndexes = wizardSteps
        .map((step, index) => (step.fields.some((field) => Boolean(errors[field])) ? index : -1))
        .filter((index) => index >= 0);

      if (invalidStepIndexes.length > 0) {
        if (isFinalStep) {
          setReviewErrorStepIndexes(invalidStepIndexes);
          return;
        }

        setStepIndex(invalidStepIndexes[0]!);
      }
    }
  );

  const preventImplicitSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form onSubmit={preventImplicitSubmit} className="space-y-5" noValidate>
      <Card className="overflow-hidden">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">
                Step {stepIndex + 1} of {wizardSteps.length}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{currentStep.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{currentStep.description}</p>
            </div>
            <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">{progressPercent}% complete</div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-700 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="grid gap-2 md:grid-cols-5">
            {wizardSteps.map((step, index) => {
              const Icon = step.icon;
              const isCurrent = index === stepIndex;
              const isComplete = index < stepIndex;
              const hasError = step.fields.some((field) => Boolean(form.formState.errors[field]));

              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={index > stepIndex}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => {
                    if (index <= stepIndex) {
                      setStepIndex(index);
                      setReviewErrorStepIndexes([]);
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition",
                    isCurrent && "border-brand-700 bg-brand-50 text-brand-900",
                    isComplete && "border-emerald-200 bg-emerald-50 text-emerald-900",
                    !isCurrent && !isComplete && "border-slate-200 bg-white text-slate-500",
                    hasError && "border-red-300 bg-red-50 text-red-800",
                    index > stepIndex && "cursor-not-allowed opacity-70"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      isCurrent && "bg-brand-700 text-white",
                      isComplete && "bg-emerald-600 text-white",
                      !isCurrent && !isComplete && "bg-slate-100 text-slate-500",
                      hasError && "bg-red-600 text-white"
                    )}
                  >
                    {isComplete ? <Check size={17} /> : <Icon size={17} />}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{step.shortTitle}</span>
                    <span className="block text-xs text-current opacity-70">{index + 1}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentStep.key === "details" ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Event Details</h2>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Start with a preset</span>
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => applyPreset("standard")} className="rounded-xl border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50"><span className="block text-sm font-bold">Standard event</span><span className="mt-1 block text-xs text-slate-500">Photos, 60 minutes, 100 m zone</span></button>
                <button type="button" onClick={() => applyPreset("seminar")} className="rounded-xl border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50"><span className="block text-sm font-bold">Short seminar</span><span className="mt-1 block text-xs text-slate-500">Time In photo, 30 minutes</span></button>
                <button type="button" onClick={() => applyPreset("secure")} className="rounded-xl border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50"><span className="block text-sm font-bold">QR-secured</span><span className="mt-1 block text-xs text-slate-500">QR and photos, tighter 75 m zone</span></button>
              </div>
            </div>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Event title</span>
              <Input {...form.register("title")} />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Description</span>
              <Textarea {...form.register("description")} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">Type</span>
              <Input {...form.register("type")} />
            </label>
            {statusControl}
            <label>
              <span className="mb-2 block text-sm font-semibold">Required or optional</span>
              <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...form.register("requirement")}>
                <option value="required">Required</option>
                <option value="optional">Optional</option>
              </select>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {currentStep.key === "schedule" ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Schedule</h2>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900 md:col-span-4"><strong>Summary:</strong> {values.eventDate} · event {values.startsAt || "—"}–{values.endsAt || "—"} · Time In {values.checkInOpensAt || "—"}–{values.checkInClosesAt || "—"} · Time Out {values.checkOutOpensAt || "—"}–{values.checkOutClosesAt || "—"}</div>
            <label>
              <span className="mb-2 block text-sm font-semibold">Date</span>
              <Input type="date" {...form.register("eventDate")} />
            </label>
            {timeFields.map((name) => (
              <label key={name}>
                <span className="mb-2 block text-sm font-semibold">{timeFieldLabels[name]}</span>
                <Input type="time" {...form.register(name)} />
              </label>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {currentStep.key === "location" ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Location and Attendance Zone</h2>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">Venue name</span>
              <Input {...form.register("venueName")} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">Address</span>
              <Input {...form.register("address")} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">Attendance radius</span>
              <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...form.register("radiusMeters")}>
                {[50, 75, 100, 150, 200].map((value) => (
                  <option key={value} value={value}>
                    {value} meters
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">Zone mode</span>
              <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...form.register("zoneMode")}>
                <option value="circle">Circular radius</option>
                <option value="polygon">Polygon boundary</option>
                <option value="multiple">Multiple zones</option>
              </select>
            </label>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {zoneMode === "polygon" ? "Click the map to add polygon points. Use the radius option for quick circular zones." : "Click or drag the marker to set the event location."}
            </div>
            <div className="md:col-span-2">
              <button type="button" className="text-sm font-bold text-brand-700" onClick={() => setShowAdvancedLocation((current) => !current)}>{showAdvancedLocation ? "Hide" : "Show"} advanced coordinates and GPS accuracy</button>
              {showAdvancedLocation ? <div className="mt-3 grid gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-3"><label><span className="mb-2 block text-sm font-semibold">Latitude</span><Input type="number" step="any" {...form.register("latitude")} /></label><label><span className="mb-2 block text-sm font-semibold">Longitude</span><Input type="number" step="any" {...form.register("longitude")} /></label><label><span className="mb-2 block text-sm font-semibold">GPS accuracy (m)</span><Input type="number" {...form.register("requiredGpsAccuracyMeters")} /></label></div> : null}
            </div>
            <div className="md:col-span-2">
              <LocationPicker
                latitude={Number(latitude)}
                longitude={Number(longitude)}
                radiusMeters={Number(radius)}
                drawPolygon={zoneMode === "polygon"}
                polygonPoints={polygonPoints}
                onChange={(coordinate) => {
                  form.setValue("latitude", coordinate.latitude, { shouldDirty: true });
                  form.setValue("longitude", coordinate.longitude, { shouldDirty: true });
                }}
                onPolygonChange={(coordinates) => {
                  form.setValue("zones", [{ name: "Polygon zone", zoneType: "polygon", radiusMeters: null, coordinates }], { shouldValidate: true, shouldDirty: true });
                }}
              />
              {zoneMode === "polygon" ? (
                <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                  <span>{polygonPoints.length} polygon points selected</span>
                  <button type="button" className="font-semibold text-brand-700" onClick={() => form.setValue("zones", [], { shouldDirty: true })}>
                    Clear polygon
                  </button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep.key === "verification" ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Verification Rules</h2>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">
              <input className="mt-1 h-4 w-4 accent-brand-700" type="checkbox" {...form.register("photoRequired")} />
              <span>
                <span className="block text-slate-950">Time-in photo required</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">Students must capture live proof before submitting.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">
              <input className="mt-1 h-4 w-4 accent-brand-700" type="checkbox" {...form.register("timeOutPhotoRequired")} />
              <span>
                <span className="block text-slate-950">Time-out photo required</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">Require evidence when students leave the event.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">
              <input className="mt-1 h-4 w-4 accent-brand-700" type="checkbox" {...form.register("dynamicQrRequired")} />
              <span>
                <span className="block text-slate-950">Dynamic QR required</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">Ask students to scan a rotating event code.</span>
              </span>
            </label>
            <label className="md:col-span-3">
              <span className="mb-2 block text-sm font-semibold">Minimum attendance duration</span>
              <Input type="number" {...form.register("minimumAttendanceMinutes")} />
            </label>
          </CardContent>
        </Card>
      ) : null}

      {currentStep.key === "assignment" ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Assignment and Review</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">Assigned year levels</span>
                <Controller
                  control={form.control}
                  name="assignedYearLevels"
                  render={({ field }) => {
                    const selected = field.value ?? [];

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {yearLevelOptions.map((yearLevel) => {
                          const checked = selected.includes(yearLevel);

                          return (
                            <label
                              key={yearLevel}
                              className={cn(
                                "flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition",
                                checked ? "border-brand-700 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <input
                                className="sr-only"
                                type="checkbox"
                                checked={checked}
                                onChange={(inputEvent: ChangeEvent<HTMLInputElement>) => {
                                  if (inputEvent.target.checked) {
                                    field.onChange([...selected, yearLevel].sort((a, b) => a - b));
                                  } else {
                                    field.onChange(selected.filter((value) => value !== yearLevel));
                                  }
                                }}
                              />
                              Year {yearLevel}
                            </label>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <span className="mt-1 block text-xs text-slate-500">Leave all unchecked to assign this event to all active students.</span>
              </label>

              <Controller
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <label>
                    <span className="mb-2 block text-sm font-semibold">Maximum participants</span>
                    <Input
                      type="number"
                      min={1}
                      placeholder="No limit"
                      value={field.value ?? ""}
                      onChange={(inputEvent: ChangeEvent<HTMLInputElement>) => field.onChange(inputEvent.target.value ? Number(inputEvent.target.value) : null)}
                    />
                  </label>
                )}
              />

              <Controller
                control={form.control}
                name="registrationDeadline"
                render={({ field }) => (
                  <label>
                    <span className="mb-2 block text-sm font-semibold">Registration deadline</span>
                    <Input
                      type="datetime-local"
                      value={field.value ?? ""}
                      onChange={(inputEvent: ChangeEvent<HTMLInputElement>) => field.onChange(inputEvent.target.value || null)}
                    />
                  </label>
                )}
              />

              <Controller
                control={form.control}
                name="notificationSchedule"
                render={({ field }) => {
                  const selected = field.value ?? [];

                  return (
                    <label>
                      <span className="mb-2 block text-sm font-semibold">Notification schedule</span>
                      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                        {notificationOptions.map((option) => {
                          const checked = selected.includes(option.value);

                          return (
                            <label key={option.value} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <input
                                className="h-4 w-4 accent-brand-700"
                                type="checkbox"
                                checked={checked}
                                onChange={(inputEvent: ChangeEvent<HTMLInputElement>) => {
                                  if (inputEvent.target.checked) {
                                    field.onChange([...selected, option.value]);
                                  } else {
                                    field.onChange(selected.filter((value) => value !== option.value));
                                  }
                                }}
                              />
                              {option.label}
                            </label>
                          );
                        })}
                      </div>
                    </label>
                  );
                }}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-bold text-slate-950">{reviewTitle}</h3>
                <p className="text-xs font-medium text-slate-500">Use Edit to jump back to a section that needs changes.</p>
              </div>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                {reviewCards.map((card) => (
                  <div key={card.key} className="rounded-lg bg-white p-3">
                    <dt className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {card.label}
                      <button
                        type="button"
                        className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold normal-case tracking-normal text-brand-700"
                        onClick={() => {
                          setStepIndex(stepIndexFor(card.step));
                          setReviewErrorStepIndexes([]);
                          setSubmitError(null);
                          setSubmitSuccess(null);
                        }}
                      >
                        Edit
                      </button>
                    </dt>
                    <dd className="mt-2 text-sm font-semibold text-slate-950">{card.value(values)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {reviewErrorStepIndexes.length ? (
        <div className="rounded-md bg-amber-50 p-4 text-sm font-medium text-amber-900">
          <p>This event still has sections that need correction before saving.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewErrorStepIndexes.map((invalidStepIndex) => {
              const step = wizardSteps[invalidStepIndex];

              if (!step) {
                return null;
              }

              return (
                <button
                  key={step.key}
                  type="button"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm"
                  onClick={() => {
                    setStepIndex(invalidStepIndex);
                    setReviewErrorStepIndexes([]);
                    setSubmitError(null);
                    setSubmitSuccess(null);
                  }}
                >
                  Fix {step.shortTitle}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {Object.keys(form.formState.errors).length ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">Please review the highlighted fields before saving.</div>
      ) : null}

      {submitError ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{submitError}</div> : null}

      {submitSuccess ? <div className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{submitSuccess}</div> : null}

      <div className="flex flex-col-reverse gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={stepIndex === 0 || form.formState.isSubmitting}
          onClick={() => {
            setStepIndex((current) => Math.max(current - 1, 0));
            setReviewErrorStepIndexes([]);
            setSubmitError(null);
            setSubmitSuccess(null);
          }}
        >
          Back
        </Button>

        {isFinalStep ? (
          <Button type="button" disabled={form.formState.isSubmitting} onClick={() => void submit()}>
            <Save size={16} />
            {form.formState.isSubmitting ? submittingLabel : submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={() => void goNext()}>
            Next
          </Button>
        )}
      </div>
    </form>
  );
}
