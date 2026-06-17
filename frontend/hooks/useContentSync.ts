import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store";
import getEcho from "@/services/echo";
import {
  applyContentUpdate,
  reconcileContentVersion,
  type ContentUpdatePayload,
} from "@/services/contentSync";

/**
 * Global admin→customer realtime sync. Mount once near the app root.
 *
 *  • Subscribes to the PUBLIC Pusher channel `app-content` and reacts to
 *    `admin.content.updated` instantly while the app is open (any screen).
 *  • On mount, on app resume (foreground), and on socket reconnect, calls
 *    GET /api/app/content-version to catch changes missed while
 *    offline/closed — before the user sees stale content.
 */
export function useContentSync(): void {
  const queryClient = useQueryClient();
  const bumpContentVersion = useStore((s) => s.bumpContentVersion);
  const channelRef = useRef<any>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // 1) Reconcile immediately on mount (covers "app was closed during update").
    reconcileContentVersion(queryClient, bumpContentVersion);

    // 2) Subscribe to the public realtime channel.
    (async () => {
      try {
        const echo = await getEcho();
        if (!mounted.current) return;

        const channel = echo.channel("app-content"); // public → no auth, reaches guests
        channelRef.current = channel;

        channel.listen(".admin.content.updated", (payload: ContentUpdatePayload) => {
          console.log("[ContentSync] 📡 admin.content.updated", payload);
          applyContentUpdate(payload, queryClient, bumpContentVersion);
        });

        // Re-reconcile whenever the socket (re)connects — covers reconnect
        // after a network drop where we may have missed events.
        try {
          echo.connector.pusher.connection.bind("connected", () => {
            console.log("[ContentSync] socket connected → reconcile");
            reconcileContentVersion(queryClient, bumpContentVersion);
          });
        } catch {
          /* connector internals not available — non-fatal */
        }

        console.log("[ContentSync] subscribed to public channel 'app-content'");
      } catch (e) {
        console.log("[ContentSync] echo subscribe failed (will rely on polling):", e);
      }
    })();

    // 3) Reconcile on app foreground (covers "offline → reconnect" and resume).
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        reconcileContentVersion(queryClient, bumpContentVersion);
      }
    });

    return () => {
      mounted.current = false;
      sub.remove();
      try {
        if (channelRef.current) {
          channelRef.current.stopListening(".admin.content.updated");
          // leave the channel; getEcho() is a shared singleton
        }
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default useContentSync;
