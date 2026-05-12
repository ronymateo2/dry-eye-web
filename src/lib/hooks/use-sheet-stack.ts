import { useCallback, useRef, useState } from "react";
import type { SheetLayer } from "@/components/layout/stacked-sheet";

export type SheetStackState = {
  layers: SheetLayer[];
  push: (layer: SheetLayer) => void;
  pop: () => void;
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
