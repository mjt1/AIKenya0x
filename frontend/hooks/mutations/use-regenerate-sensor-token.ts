"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { farmerSensorsQueryKey } from "@/hooks/queries/use-sensors";
import type { RegenerateTokenResult } from "@/lib/sensors";

/** Regenerate a sensor's token (POST /sensors/:id/token). Invalidates the old one. */
export function useRegenerateSensorToken(farmerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sensorId: string) =>
      apiFetch<RegenerateTokenResult>(`/sensors/${sensorId}/token`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: farmerSensorsQueryKey(farmerId),
      });
    },
  });
}
