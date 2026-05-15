import { useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "motion/react";
import { EyedropperIcon } from "@phosphor-icons/react";

export function TodayCountBadge({
  count,
  onClick,
  label,
  className = "",
  iconSize = 12,
}: {
  count: number;
  onClick: () => void;
  label?: string;
  className?: string;
  iconSize?: number;
}) {
  const badgeAnim = useAnimation();

  useEffect(() => {
    if (count > 0) {
      void badgeAnim.start({
        scale: [1, 1.28, 1],
        transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] },
      });
    }
  }, [count, badgeAnim]);

  return (
    <motion.button
      type="button"
      animate={badgeAnim}
      onClick={onClick}
      aria-label={`Ver ${count} dosis registradas hoy`}
      className={`inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-[var(--accent)]/10 font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 active:scale-[0.97] active:bg-[var(--accent)]/25 ${className}`}
    >
      <EyedropperIcon size={iconSize} weight="bold" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="block tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>
      {label && <span>{label}</span>}
    </motion.button>
  );
}
