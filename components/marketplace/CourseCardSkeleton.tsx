export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <div className="aspect-video w-full animate-pulse bg-surface-container-high" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-6 w-3/4 animate-pulse rounded-md bg-surface-container-high" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface-container-high" />
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="h-6 w-16 animate-pulse rounded-md bg-surface-container-high" />
          <div className="h-4 w-10 animate-pulse rounded-md bg-surface-container-high" />
        </div>
      </div>
    </div>
  );
}
