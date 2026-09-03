import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshEvents } from "../repositories/eventsRepository";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/authStore";
import { useOnlineStatus } from "./useOnlineStatus";

const REALTIME_EVENT_TABLES = ["events", "event_schedules", "event_locations", "event_zones", "event_participants"] as const;

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const studentId = useAuthStore((state) => state.student?.id);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!online || !studentId) return;

    function queueRefresh() {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);

      refreshTimer.current = setTimeout(() => {
        void refreshEvents()
          .then((events) => queryClient.setQueryData(["events"], events))
          .catch(() => {
            void queryClient.invalidateQueries({ queryKey: ["events"] });
          });
      }, 350);
    }

    const channel = supabase.channel(`student-events:${studentId}`);

    for (const table of REALTIME_EVENT_TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table
        },
        queueRefresh
      );
    }

    void channel.subscribe((status) => {
      if (status === "SUBSCRIBED") queueRefresh();
    });

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [online, queryClient, studentId]);
}
