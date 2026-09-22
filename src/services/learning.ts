import type { Lesson } from "@/types";

export class LearningService {
  static getLessons(): Lesson[] {
    return [
      {
        id: 1,
        title: "Fractions Fundamentals",
        category: "Arithmetic",
        level: "Beginner",
        duration: "12 min",
        summary: "Understand numerators, denominators, equivalent fractions, and simplification.",
        objectives: ["Find equivalent fractions", "Simplify fractions", "Compare fractions"],
      },
      {
        id: 2,
        title: "Linear Equations",
        category: "Algebra",
        level: "Intermediate",
        duration: "18 min",
        summary: "Learn how to isolate a variable and solve equations step by step.",
        objectives: ["Reverse operations", "Balance equations", "Check solutions"],
      },
      {
        id: 3,
        title: "Intro to Geometry",
        category: "Geometry",
        level: "Intermediate",
        duration: "15 min",
        summary: "Build confidence with circles, angles, area, and perimeter.",
        objectives: ["Angle relationships", "Area formulas", "Perimeter reasoning"],
      },
      {
        id: 4,
        title: "Probability Basics",
        category: "Probability",
        level: "Intermediate",
        duration: "14 min",
        summary: "Interpret chance, sample spaces, and simple probability rules.",
        objectives: ["Fractions as probability", "Sample space", "Independent events"],
      },
    ];
  }
}
