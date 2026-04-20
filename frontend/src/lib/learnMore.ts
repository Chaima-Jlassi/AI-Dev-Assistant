export type LearnMoreTopic = {
  slug: string;
  title: string;
  summary: string;
  howToUse: string[];
  bestResults: string[];
};

export const learnMoreTopics: LearnMoreTopic[] = [
  {
    slug: "architecture-design",
    title: "Architecture Design",
    summary:
      "Generate architecture recommendations (MVC, layered, clean architecture, microservices) from your project goals and constraints.",
    howToUse: [
      "Start with your product goal and target users.",
      "Mention expected scale, deployment style, and team size.",
      "Share key constraints like budget, timeline, or required technologies.",
    ],
    bestResults: [
      "Provide explicit non-functional requirements (performance, security, maintainability).",
      "Ask for trade-offs between at least two candidate architectures.",
      "Request a phased plan: MVP architecture first, then growth architecture.",
    ],
  },
  {
    slug: "uml-diagrams",
    title: "UML Diagrams",
    summary:
      "Create class, sequence, component, activity, and use-case diagrams that explain system behavior and structure.",
    howToUse: [
      "Describe the domain entities and their relationships.",
      "Share one concrete user flow to generate sequence/activity diagrams.",
      "Specify the diagram type you want before generating.",
    ],
    bestResults: [
      "Keep each diagram focused on one scenario or bounded context.",
      "Use consistent naming for classes, services, and modules.",
      "Ask for diagram revisions after validating with your team.",
    ],
  },
  {
    slug: "readme-docs",
    title: "README & Docs",
    summary:
      "Generate clear README files and technical docs with setup instructions, architecture notes, and usage examples.",
    howToUse: [
      "Provide project purpose, stack, and installation commands.",
      "Include run/build/test commands and environment variables.",
      "Ask for sections like API usage, troubleshooting, and contribution guide.",
    ],
    bestResults: [
      "Share real commands from your repository to avoid placeholder docs.",
      "Request beginner-friendly wording if your audience is mixed.",
      "Regenerate docs when scripts or architecture change.",
    ],
  },
  {
    slug: "project-structure",
    title: "Project Structure",
    summary:
      "Design scalable folder structures and module boundaries for cleaner code organization and easier collaboration.",
    howToUse: [
      "Tell DevAssist if your app is monolith, modular monolith, or microservices.",
      "Specify language/framework conventions you want to keep.",
      "Ask for folder structure mapped to clear responsibilities.",
    ],
    bestResults: [
      "Separate domain logic from infrastructure and UI concerns.",
      "Define naming conventions early and keep them consistent.",
      "Review dependency direction to avoid cross-module coupling.",
    ],
  },
];

export const learnMoreBySlug = Object.fromEntries(
  learnMoreTopics.map((topic) => [topic.slug, topic]),
) as Record<string, LearnMoreTopic>;
