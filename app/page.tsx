export default function HomePage() {
  return (
    <div className="container-app py-stack-lg">
      <div className="flex flex-col gap-stack-md">
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-surface-container" />
        <div className="h-6 w-1/2 animate-pulse rounded-md bg-surface-container" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-surface-container" />
      </div>
    </div>
  );
}
