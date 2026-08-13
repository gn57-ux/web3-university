import { FeaturedCourses } from "@/components/home/FeaturedCourses";
import { Hero } from "@/components/home/Hero";
import { LearningPath } from "@/components/home/LearningPath";
import { StatsSection } from "@/components/home/StatsSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsSection />
      <LearningPath />
      <FeaturedCourses />
    </>
  );
}
