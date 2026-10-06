"use client";

import { useEffect } from "react";

export default function DeviceHeartbeat() {
  useEffect(() => {
    let stopped = false;

    async function refreshDevice() {
      if (stopped) return;

      try {
        const response = await fetch(
          "/api/auth/refresh-device",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          return;
        }

        if (response.status === 409) {
          console.warn(
            "This device session is no longer active."
          );
        }
      } catch (error) {
        console.warn(
          "Device heartbeat failed:",
          error
        );
      }
    }

    // Refresh shortly after the page loads.
    refreshDevice();

    // Then keep the active device alive.
    const interval = setInterval(
      refreshDevice,
      5 * 60 * 1000
    );

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
