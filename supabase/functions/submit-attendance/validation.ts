export interface AttendancePayload {
  local_id: string;
  event_id: string;
  mode: "time_in" | "time_out";
  device_timestamp: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  photo_storage_path?: string;
  photo_hash?: string;
  qr_token?: string;
  device_id: string;
  idempotency_key: string;
  is_offline_submission: boolean;
}

export function validateAttendancePayload(body: Partial<AttendancePayload>) {
  const required = ["local_id", "event_id", "mode", "device_timestamp", "latitude", "longitude", "accuracy_meters", "device_id", "idempotency_key"] as const;
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === "") {
      throw new Response(JSON.stringify({ error: `Missing ${key}.` }), { status: 400 });
    }
  }

  if (!["time_in", "time_out"].includes(String(body.mode))) {
    throw new Response(JSON.stringify({ error: "Invalid attendance mode." }), { status: 400 });
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy_meters);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Response(JSON.stringify({ error: "Invalid latitude." }), { status: 400 });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Response(JSON.stringify({ error: "Invalid longitude." }), { status: 400 });
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1000) {
    throw new Response(JSON.stringify({ error: "Invalid GPS accuracy." }), { status: 400 });
  }

  if (!Number.isFinite(Date.parse(String(body.device_timestamp)))) {
    throw new Response(JSON.stringify({ error: "Invalid device timestamp." }), { status: 400 });
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(String(body.event_id)) || !uuidPattern.test(String(body.device_id))) {
    throw new Response(JSON.stringify({ error: "Invalid event or device identifier." }), { status: 400 });
  }

  if (!/^[A-Za-z0-9_-]{8,200}$/.test(String(body.local_id))) {
    throw new Response(JSON.stringify({ error: "Invalid local attendance identifier." }), { status: 400 });
  }

  if (String(body.idempotency_key).length < 12 || String(body.idempotency_key).length > 500) {
    throw new Response(JSON.stringify({ error: "Invalid idempotency key." }), { status: 400 });
  }
}
