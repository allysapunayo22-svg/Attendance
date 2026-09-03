import { LiveAttendanceTable } from "@/components/attendance/LiveAttendanceTable";
import { DynamicQrPanel } from "@/components/attendance/DynamicQrPanel";

export default function LiveAttendancePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Live Attendance Monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">Realtime updates include student, timestamps, distance, GPS accuracy, photos, device information, and suspicious flags.</p>
      </div>
      <DynamicQrPanel />
      <LiveAttendanceTable />
    </div>
  );
}
