/** 合并 CSS 类名，自动过滤掉 falsy 值 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
