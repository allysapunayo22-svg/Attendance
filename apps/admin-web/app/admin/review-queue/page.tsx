import { AttendanceReviewQueue } from "@/components/attendance/AttendanceReviewQueue";

export default function AttendanceReviewPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Attendance Review</h1>
        <p className="mt-1 text-sm text-slate-500">Review submitted photos, location distance, GPS accuracy, QR verification, device checks, and suspicious flags.</p>
      </div>
      <AttendanceReviewQueue />
    </div>
  );
}
