import type { ReactNode } from "react";

type ViewHeaderProps = {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
};

export function ViewHeader({ eyebrow, title, actions }: ViewHeaderProps) {
  return (
    <div className="view-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions}
    </div>
  );
}
