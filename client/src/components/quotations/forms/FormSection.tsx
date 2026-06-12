import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function FormSection({ title, subtitle, children }: FormSectionProps) {
  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
