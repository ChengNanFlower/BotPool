import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

/** 通用多行文本输入组件，封装原生 <textarea> 样式 */
export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none",
        className,
      )}
      {...props}
    />
  );
}
