import { useLocalSearchParams } from "expo-router";
import { AttendanceCaptureScreen } from "../../../src/features/attendance/AttendanceCaptureScreen";

export default function CheckInScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  return <AttendanceCaptureScreen eventId={eventId} mode="time_in" />;
}
