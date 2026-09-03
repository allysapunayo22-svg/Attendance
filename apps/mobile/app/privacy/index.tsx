import { ScrollView, Text, View } from "react-native";

const items = [
  ["Why location is collected", "Location is used to verify that attendance is submitted inside an approved event zone."],
  ["Why photos are collected", "Live photos help administrators confirm that the student personally submitted the attendance record."],
  ["When location is collected", "The app requests location only when viewing distance from an active event, checking in, checking out, or refreshing eligibility."],
  ["Who can view evidence", "Authorized administrators can view attendance evidence for review, correction, and audit purposes."],
  ["Photo retention", "Administrators configure retention per event, such as 30 days, one semester, or one academic year."],
  ["Corrections", "Students can submit absence requests, late explanations, or attendance appeals from the profile screen."]
];

export default function PrivacyScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-3 p-5">
      <Text className="text-2xl font-bold text-slate-950">Privacy Notice</Text>
      <Text className="text-sm leading-6 text-slate-600">The app does not continuously track students. Attendance evidence is collected only for event eligibility and review.</Text>
      {items.map(([title, body]) => (
        <View key={title} className="rounded-lg border border-slate-200 bg-white p-4">
          <Text className="font-semibold text-slate-950">{title}</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">{body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
