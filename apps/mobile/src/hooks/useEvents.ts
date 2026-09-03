import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCachedAnnouncements, getCachedEvents, refreshAnnouncements, refreshEvents } from "../repositories/eventsRepository";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const cached = await getCachedEvents();
      try {
        // Refresh before rendering so a deleted or unassigned cached event
        // cannot accept a new attendance capture while the app is online.
        return await refreshEvents();
      } catch {
        return cached;
      }
    },
    staleTime: 30_000
  });
}

export function useAnnouncements() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const cached = await getCachedAnnouncements();
      if (cached.length) {
        void refreshAnnouncements()
          .then((announcements) => queryClient.setQueryData(["announcements"], announcements))
          .catch(() => null);
        return cached;
      }
      return refreshAnnouncements();
    },
    staleTime: 60_000
  });
}
