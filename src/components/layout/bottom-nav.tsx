import { Link, useLocation } from "react-router-dom";
import { motion, LayoutGroup } from "motion/react";
import {
  ChartLineIcon,
  ClipboardIcon,
  FileTextIcon,
  ClockCounterClockwiseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { APP_TABS } from "@/lib/constants";

const icons = {
  "/register": ClipboardIcon,
  "/history": ClockCounterClockwiseIcon,
  "/dashboard": ChartLineIcon,
  "/report": FileTextIcon,
  "/profile": UserIcon,
} as const;

const PILL_SPRING = { type: "spring" as const, stiffness: 380, damping: 30 };

export function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = APP_TABS.findIndex(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <nav className="bottom-nav" aria-label="Navegacion principal">
      <div className="bottom-nav__inner">
        <LayoutGroup id="bottom-nav">
          <div className="bottom-nav__rail">
            {APP_TABS.map((tab, index) => {
              const Icon = icons[tab.href];
              const isActive = index === safeActiveIndex;
              return (
                <Link
                  key={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className="bottom-nav__item"
                  data-active={String(isActive)}
                  to={tab.href}
                >
                  <span className="bottom-nav__icon" aria-hidden>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-[12px] bg-[var(--accent-dim)]"
                        transition={PILL_SPRING}
                      />
                    )}
                    <Icon size={22} weight={isActive ? "bold" : "regular"} />
                  </span>
                  <span className="bottom-nav__label">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </nav>
  );
}
