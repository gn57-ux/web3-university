import { Star } from "lucide-react";
import type { CourseReview } from "@/lib/mock/courseDetails";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} 星评分`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? "fill-secondary text-secondary" : "text-outline-variant"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CourseReviews({ reviews }: { reviews: CourseReview[] }) {
  return (
    <section className="flex flex-col gap-stack-sm">
      <h2 className="font-heading text-headline-md text-on-surface">学员评价</h2>
      <ul className="flex flex-col gap-stack-sm">
        {reviews.map((review) => (
          <li
            key={review.author}
            className="rounded-lg border border-outline-variant bg-surface-container p-4"
          >
            <StarRating rating={review.rating} />
            <p className="mt-2 text-body-md text-on-surface">{review.comment}</p>
            <div className="mt-2 flex items-center gap-2 text-label-md font-mono text-on-surface-variant">
              <span>{review.author}</span>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-code-sm">
                Verified Student
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
