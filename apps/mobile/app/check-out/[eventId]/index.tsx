import { useLocalSearchParams } from "expo-router";
import { AttendanceCaptureScreen } from "../../../src/features/attendance/AttendanceCaptureScreen";

export default function CheckOutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  return <AttendanceCaptureScreen eventId={eventId} mode="time_out" />;
}
