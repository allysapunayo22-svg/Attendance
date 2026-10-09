"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveAttendanceTable } from "@/components/attendance/LiveAttendanceTable";
import { DynamicQrPanel } from "@/components/attendance/DynamicQrPanel";

export default function LiveAttendancePage() {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Live Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor incoming check-ins and open a record to view verification details.</p>
        </div>
        <Button variant="outline" onClick={() => setShowQr((current) => !current)}>
          <QrCode size={16} />{showQr ? "Hide event QR" : "Show event QR"}
        </Button>
      </div>
      {showQr ? <DynamicQrPanel /> : null}
      <LiveAttendanceTable />
    </div>
  );
}
