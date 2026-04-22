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
      theme="dark"
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
            "!bg-[#5cb85a] !text-[#f0e4c8] [&>[data-icon]]:!text-[#f0e4c8]",
          error:
            "!bg-[#cc3f30] !text-[#f0e4c8] [&>[data-icon]]:!text-[#f0e4c8]",
          warning:
            "!bg-[#e0932a] !text-[#f0e4c8] [&>[data-icon]]:!text-[#f0e4c8]",
          info: "!bg-[var(--surface-el)] !text-[#f0e4c8] !border !border-[var(--border)] [&>[data-icon]]:!text-[#d4a24c]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
