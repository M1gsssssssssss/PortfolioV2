export type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url: string;
  archived: boolean;
};

export type PortfolioContent = {
  profile: {
    name: string;
    title: string;
    location: string;
    bio: string;
  };
  projects: PortfolioProject[];
  aboutImagePath?: string;
  introImagePath?: string;
  introImageScale?: number;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      portfolio_content: {
        Row: {
          id: number;
          content: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          content: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          content?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const starterContent: PortfolioContent = {
  profile: {
    name: "Your Name",
    title: "Designer & Developer",
    location: "Your City",
    bio: "I build thoughtful digital experiences that bring ideas to life.",
  },
  projects: [],
  aboutImagePath: "",
  introImagePath: "",
  introImageScale: 1,
};

export function isPortfolioContent(value: unknown): value is PortfolioContent {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<PortfolioContent>;
  const profile = candidate.profile;

  return (
    typeof profile === "object" &&
    profile !== null &&
    typeof profile.name === "string" &&
    typeof profile.title === "string" &&
    typeof profile.location === "string" &&
    typeof profile.bio === "string" &&
    (candidate.aboutImagePath === undefined || typeof candidate.aboutImagePath === "string") &&
    (candidate.introImagePath === undefined || typeof candidate.introImagePath === "string") &&
    (candidate.introImageScale === undefined ||
      (typeof candidate.introImageScale === "number" &&
        Number.isFinite(candidate.introImageScale) &&
        candidate.introImageScale >= 0.5 &&
        candidate.introImageScale <= 2)) &&
    Array.isArray(candidate.projects) &&
    candidate.projects.every(
      (project) =>
        typeof project === "object" &&
        project !== null &&
        typeof project.id === "string" &&
        typeof project.title === "string" &&
        typeof project.description === "string" &&
        Array.isArray(project.technologies) &&
        project.technologies.every((technology: unknown) => typeof technology === "string") &&
        typeof project.url === "string" &&
        typeof project.archived === "boolean",
    )
  );
}

export function safeExternalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
