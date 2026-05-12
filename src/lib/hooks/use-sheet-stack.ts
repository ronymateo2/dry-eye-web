/**
 * useSheetStack — imperative stack manager for StackedSheet.
 *
 * Manages pushed layers independently from the base layer. Each push auto-suffixes
 * the key with a monotonic counter so AnimatePresence always animates re-pushes of
 * the same logical key (e.g. selecting the same item twice still slides in).
 *
 * ## Caveats
 * - Layer content (ReactNode) is evaluated once at push time and stored in state.
 *   Callbacks inside content must be stable refs (useCallback) to avoid stale closures.
 * - pop + push in the same synchronous handler is batched by React 18 into one render,
 *   producing a clean exit-old / enter-new animation. Do not call from async callbacks.
 *
 * ## Usage
 * ```tsx
 * const stack = useSheetStack();
 *
 * const handleSelect = useCallback((item: Item) => {
 *   stack.push({
 *     key: "detail",
 *     title: item.name,
 *     content: <Detail item={item} onSaved={() => stack.pop()} />,
 *   });
 * }, [stack.push, stack.pop]);
 *
 * useEffect(() => { if (!open) stack.clear(); }, [open, stack.clear]);
 *
 * <StackedSheet open={open} onClose={onClose} stack={stack} baseLayer={base} />
 * ```
 */

import { useCallback, useRef, useState } from "react";
import type { SheetLayer } from "@/components/layout/stacked-sheet";

export type SheetStackState = {
  layers: SheetLayer[];
  /** Push a new layer on top. Key is auto-suffixed for AnimatePresence uniqueness. */
  push: (layer: SheetLayer) => void;
  /** Remove the top layer. */
  pop: () => void;
  /** Remove all pushed layers. Call on sheet close to reset state. */
  clear: () => void;
};

export function useSheetStack(): SheetStackState {
  const [layers, setLayers] = useState<SheetLayer[]>([]);
  const countRef = useRef(0);

  const push = useCallback((layer: SheetLayer) => {
    const key = `${layer.key}__${++countRef.current}`;
    setLayers((prev) => [...prev, { ...layer, key }]);
  }, []);

  const pop = useCallback(() => {
    setLayers((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => setLayers([]), []);

  return { layers, push, pop, clear };
}
