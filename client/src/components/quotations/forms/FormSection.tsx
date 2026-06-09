import { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, subtitle, children, className }: FormSectionProps) {
  return (
    <div className={`border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70 rounded-2xl p-4 shadow-sm ${className || ""}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
