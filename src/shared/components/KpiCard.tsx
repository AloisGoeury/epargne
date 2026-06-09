import type { LucideIcon } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | string;
};

export function KpiCard({ label, value, icon: Icon, tone = "blue" }: KpiCardProps) {
  return (
    <section className={`kpi kpi-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} aria-hidden="true" />
    </section>
  );
}
