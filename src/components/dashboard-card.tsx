import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({
  title,
  description,
  children,
  className,
}: DashboardCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-black/10 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div>
        <h2 className="text-base font-semibold text-[#17201b]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[#65726b]">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
