import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

/** 通用按钮组件，封装 variant（样式变体）和 size（尺寸） */
export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        variant === "secondary" &&
          "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
        variant === "danger" &&
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        variant === "ghost" &&
          "text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-5 py-2 text-sm",
        size === "lg" && "px-6 py-2.5 text-sm",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
