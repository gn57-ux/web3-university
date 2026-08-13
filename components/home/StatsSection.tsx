import { homeStats } from "@/lib/mock/homeStats";

export function StatsSection() {
  return (
    <section className="container-app grid grid-cols-1 gap-stack-sm py-stack-md sm:grid-cols-3">
      {homeStats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-outline-variant bg-surface-container p-6 text-center"
        >
          <p className="font-heading text-headline-lg text-primary">{stat.value}</p>
          <p className="mt-1 text-body-md text-on-surface-variant">{stat.label}</p>
        </div>
      ))}
    </section>
  );
}
