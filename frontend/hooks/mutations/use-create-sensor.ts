"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { farmerSensorsQueryKey } from "@/hooks/queries/use-sensors";
import type { CreateSensorInput, SensorCreatedResult } from "@/lib/sensors";

/** Register a sensor on a farmer (POST /farmers/:id/sensors). Token returned once. */
export function useCreateSensor(farmerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSensorInput) =>
      apiFetch<SensorCreatedResult>(`/farmers/${farmerId}/sensors`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: farmerSensorsQueryKey(farmerId),
      });
    },
  });
}
