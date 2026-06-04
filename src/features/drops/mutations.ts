import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SaveDropInput } from "./types";
import { dropsApi } from "./api";
import { invalidateDrops, invalidateDropTypes } from "./invalidation";

export function useSaveDrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveDropInput) => dropsApi.save(body),
    onSuccess: () => invalidateDrops(qc),
  });
}

export function useDeleteDrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dropsApi.remove(id),
    onSuccess: () => invalidateDrops(qc),
  });
}

export function useCreateVial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dropsApi.createVial,
    onSuccess: () => invalidateDrops(qc),
  });
}

export function useDiscardVial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dropsApi.discardVial(id),
    onSuccess: () => invalidateDrops(qc),
  });
}

export function useReorderDropTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => dropsApi.reorderTypes(ids),
    onSuccess: () => invalidateDropTypes(qc),
  });
}
