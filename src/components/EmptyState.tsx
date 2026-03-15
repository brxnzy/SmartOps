import type  { EmptyStateProps } from "../types/interfaces";

export default function EmptyState({ text }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}
