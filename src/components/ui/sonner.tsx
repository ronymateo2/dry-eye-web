import {
  CheckCircleIcon,
  InfoIcon,
  CircleNotchIcon,
  XCircleIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-center"
      offset="calc(env(safe-area-inset-top, 0px) + 16px)"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="h-4 w-4" />,
        info: <InfoIcon className="h-4 w-4" />,
        warning: <WarningOctagonIcon className="h-4 w-4" />,
        error: <XCircleIcon className="h-4 w-4" />,
        loading: <CircleNotchIcon className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-[10px] !border-0 !shadow-[0_4px_20px_rgba(0,0,0,0.5)] !text-[13px] !font-medium !leading-snug",
          success:
            "!bg-[#5cb85a] !text-white [&>[data-icon]]:!text-white",
          error:
            "!bg-[#cc3f30] !text-white [&>[data-icon]]:!text-white",
          warning:
            "!bg-[#e0932a] !text-white [&>[data-icon]]:!text-white",
          info: "!bg-[var(--surface-el)] !text-[var(--text-primary)] !border !border-[var(--border)] [&>[data-icon]]:!text-[var(--accent)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
