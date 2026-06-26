"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { farmerSensorsQueryKey } from "@/hooks/queries/use-sensors";

interface RemoveSensorResult {
  id: string;
  deletedReadings: number;
}

/** Remove a sensor + its readings (DELETE /sensors/:id). */
export function useDeleteSensor(farmerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sensorId: string) =>
      apiFetch<RemoveSensorResult>(`/sensors/${sensorId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: farmerSensorsQueryKey(farmerId),
      });
    },
  });
}
