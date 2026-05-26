import { Textarea } from "@/components/ui/Textarea";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/** TopicInput — 话题输入框（基于 Textarea） */
export function TopicInput({ value, onChange, disabled }: Props) {
  return (
    <Textarea
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="输入一个话题，让 AI 角色们展开讨论..."
      disabled={disabled}
    />
  );
}
