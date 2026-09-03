import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const styles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-sky-100 text-sky-800",
  ongoing: "bg-teal-100 text-teal-800",
  verified: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  pending_verification: "bg-amber-100 text-amber-800",
  pending_upload: "bg-sky-100 text-sky-800",
  uploading: "bg-sky-100 text-sky-800",
  uploaded: "bg-sky-100 text-sky-800",
  unread: "bg-sky-100 text-sky-800",
  read: "bg-slate-100 text-slate-700",
  failed: "bg-red-100 text-red-800",
  requires_review: "bg-purple-100 text-purple-800",
  late: "bg-orange-100 text-orange-800",
  missed: "bg-slate-200 text-slate-700",
  rejected: "bg-red-100 text-red-800",
  excused: "bg-indigo-100 text-indigo-800",
  outside_attendance_area: "bg-red-100 text-red-800",
  gps_accuracy_too_low: "bg-orange-100 text-orange-800",
  eligible_to_check_in: "bg-emerald-100 text-emerald-800",
  time_in_recorded: "bg-teal-100 text-teal-800",
  time_out_required: "bg-amber-100 text-amber-800",
  normal: "bg-slate-100 text-slate-700",
  important: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
  submitted: "bg-sky-100 text-sky-800",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  more_information_required: "bg-purple-100 text-purple-800"
};

const labels: Record<string, string> = {
  not_started: "Not started",
  eligible_to_check_in: "Ready for Time In",
  outside_attendance_area: "Outside venue",
  gps_accuracy_too_low: "Location needs retry",
  time_in_recorded: "Recorded",
  pending_upload: "Recorded on device",
  uploading: "Uploading",
  uploaded: "Uploaded",
  pending_verification: "Verifying",
  verified: "Verified",
  requires_review: "Needs attention",
  time_out_required: "Time Out needed",
  failed: "Upload failed"
};

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  verified: "checkmark-circle",
  completed: "checkmark-circle",
  pending_upload: "phone-portrait-outline",
  uploading: "cloud-upload-outline",
  uploaded: "cloud-done-outline",
  pending_verification: "shield-checkmark-outline",
  requires_review: "alert-circle-outline",
  failed: "cloud-offline-outline",
  rejected: "close-circle-outline",
  late: "time-outline",
  time_out_required: "log-out-outline",
  eligible_to_check_in: "log-in-outline"
};

export function statusLabel(status?: string | null) {
  if (!status) return "Not started";
  if (labels[status]) return labels[status];
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status?: string | null }) {
  const style = styles[status ?? ""] ?? "bg-slate-100 text-slate-700";
  const [bg, text] = style.split(" ");
  const icon = icons[status ?? ""];
  const color = text === "text-red-800" ? "#991b1b" : text === "text-amber-800" || text === "text-orange-800" ? "#9a3412" : text === "text-emerald-800" || text === "text-teal-800" ? "#065f46" : text === "text-purple-800" ? "#6b21a8" : text === "text-sky-800" ? "#075985" : "#334155";

  return (
    <View accessibilityLabel={`Status: ${statusLabel(status)}`} className={`self-start flex-row items-center rounded-full px-3 py-1 ${bg}`}>
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      {icon ? <View className="w-1" /> : null}
      <Text className={`text-xs font-semibold ${text}`}>{statusLabel(status)}</Text>
    </View>
  );
}
