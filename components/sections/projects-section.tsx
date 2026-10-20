"use client";

import { type FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ScrollRevealText from "@/components/features/scroll-reveal-text";
import {
  safeExternalUrl,
  type PortfolioProject,
} from "@/lib/portfolio";

type ProjectDraft = Omit<PortfolioProject, "id" | "archived">;

const emptyProject: ProjectDraft = {
  title: "",
  description: "",
  technologies: [],
  url: "",
};

export default function ProjectsSection({
  projects,
  isAdmin,
  saving,
  notice,
  onSaveProjects,
}: {
  projects: PortfolioProject[];
  isAdmin: boolean;
  saving: boolean;
  notice: string;
  onSaveProjects: (projects: PortfolioProject[]) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [activeTechnology, setActiveTechnology] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(emptyProject);
  const shouldReduceMotion = useReducedMotion();

  const technologies = useMemo(
    () =>
      [
        ...new Set(
          projects
            .filter((project) => (isAdmin && showArchived ? true : !project.archived))
            .flatMap((project) => project.technologies),
        ),
      ].sort(),
    [isAdmin, projects, showArchived],
  );

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (project.archived && (!isAdmin || !showArchived)) return false;
      if (activeTechnology !== "All" && !project.technologies.includes(activeTechnology)) {
        return false;
      }
      return (
        !query ||
        [project.title, project.description, ...project.technologies]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [activeTechnology, isAdmin, projects, search, showArchived]);
  const archivedCount = projects.filter((project) => project.archived).length;

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const project: PortfolioProject = {
      ...projectDraft,
      technologies: projectDraft.technologies.map((technology) => technology.trim()).filter(Boolean),
      id: editingProject || crypto.randomUUID(),
      archived: projects.find((item) => item.id === editingProject)?.archived ?? false,
    };
    const nextProjects = editingProject
      ? projects.map((item) => (item.id === editingProject ? project : item))
      : [project, ...projects];

    if (await onSaveProjects(nextProjects)) {
      setEditingProject(null);
      setProjectDraft(emptyProject);
    }
  }

  function startEditingProject(project: PortfolioProject) {
    setEditingProject(project.id);
    setProjectDraft({
      title: project.title,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
    });
  }

  async function toggleArchived(project: PortfolioProject) {
    const nextProjects = projects.map((item) =>
      item.id === project.id ? { ...item, archived: !item.archived } : item,
    );
    await onSaveProjects(nextProjects);
  }

  return (
    <section id="work" className="work-section border-y">
      <div className="mx-auto max-w-none px-6 py-20 sm:px-10 sm:py-28 lg:px-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="section-kicker text-xs font-semibold uppercase tracking-[0.2em]">
              <ScrollRevealText>Selected work / 02</ScrollRevealText>
            </p>
            <h2 className="section-title mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              <ScrollRevealText>Projects & experiments</ScrollRevealText>
            </h2>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              {archivedCount > 0 && (
                <button
                  className="filter-button rounded-full border px-4 py-2.5 text-sm"
                  onClick={() => setShowArchived((current) => !current)}
                  type="button"
                >
                  {showArchived ? "Hide" : "Show"} archived ({archivedCount})
                </button>
              )}
              <button
                className="primary-button rounded-full px-5 py-2.5 text-sm font-medium"
                onClick={() => {
                  setEditingProject("");
                  setProjectDraft(emptyProject);
                }}
                type="button"
              >
                Add project +
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="sr-only" htmlFor="project-search">Search projects</label>
          <input
            id="project-search"
            className="portfolio-input w-full rounded-full border px-5 py-3 text-sm outline-none sm:max-w-xs"
            placeholder="Search projects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-2" aria-label="Filter by technology">
            {["All", ...technologies].map((technology) => (
              <button
                aria-pressed={activeTechnology === technology}
                className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                  activeTechnology === technology ? "filter-active" : "filter-idle"
                }`}
                key={technology}
                onClick={() => setActiveTechnology(technology)}
                type="button"
              >
                {technology}
              </button>
            ))}
          </div>
        </div>

        {isAdmin && editingProject !== null && (
          <form onSubmit={saveProject} className="editor-panel mt-8 grid gap-4 rounded-3xl border p-6 sm:grid-cols-2">
            <h3 className="text-lg font-semibold sm:col-span-2">{editingProject ? "Edit project" : "New project"}</h3>
            <TextField label="Project name" value={projectDraft.title} onChange={(title) => setProjectDraft({ ...projectDraft, title })} required />
            <TextField label="Project link (optional)" value={projectDraft.url} onChange={(url) => setProjectDraft({ ...projectDraft, url })} type="url" />
            <label className="form-label grid gap-2 text-sm font-medium sm:col-span-2">
              Description
              <textarea
                className="portfolio-input min-h-24 rounded-xl border px-3 py-2 font-normal outline-none"
                maxLength={2000}
                value={projectDraft.description}
                onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })}
                required
              />
            </label>
            <TextField
              label="Technologies (comma separated)"
              value={projectDraft.technologies.join(", ")}
              onChange={(value) => setProjectDraft({ ...projectDraft, technologies: value.split(",") })}
            />
            <div className="flex items-end gap-3">
              <button disabled={saving} className="primary-button rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50" type="submit">
                {saving ? "Saving..." : "Save project"}
              </button>
              <button className="secondary-button rounded-full px-4 py-2.5 text-sm" onClick={() => setEditingProject(null)} type="button">
                Cancel
              </button>
            </div>
          </form>
        )}

        {notice && <p role="status" className="status-message mt-5 rounded-xl px-4 py-3 text-sm">{notice}</p>}

        {visibleProjects.length === 0 ? (
          <p className="empty-state mt-10 rounded-2xl border border-dashed p-8 text-center text-sm">
            {projects.length === 0
              ? isAdmin
                ? "Your portfolio is ready. Add your first project above."
                : "Projects are coming soon."
              : "No projects match your search."}
          </p>
        ) : (
          <motion.div layout className="mt-8 grid gap-5 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visibleProjects.map((project, index) => {
                const projectUrl = safeExternalUrl(project.url);
                return (
                  <motion.article
                    layout
                    className="project-card group rounded-3xl border p-6 transition hover:-translate-y-1 sm:p-8"
                    key={project.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="project-index text-xs font-semibold tracking-[0.16em]">
                        {String(index + 1).padStart(2, "0")} / PROJECT
                      </p>
                      {project.archived && <span className="archive-badge rounded-full px-3 py-1 text-xs">Archived</span>}
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold tracking-tight">
                      <ScrollRevealText>{project.title}</ScrollRevealText>
                    </h3>
                    <p className="project-description mt-3 min-h-12 text-sm leading-6">
                      <ScrollRevealText>{project.description}</ScrollRevealText>
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {project.technologies.map((technology) => (
                        <span className="tech-tag rounded-full px-3 py-1.5 text-xs" key={technology}>{technology}</span>
                      ))}
                    </div>
                    <div className="project-footer mt-8 flex items-center justify-between gap-4 border-t pt-5">
                      {projectUrl ? (
                        <a className="project-link text-sm font-medium hover:underline" href={projectUrl} target="_blank" rel="noopener noreferrer">
                          View project <span aria-hidden="true">↗</span>
                        </a>
                      ) : <span />}
                      {isAdmin && (
                        <div className="flex gap-3 text-sm">
                          <button className="project-action" onClick={() => startEditingProject(project)} type="button">Edit</button>
                          <button className="project-action" onClick={() => void toggleArchived(project)} type="button">
                            {project.archived ? "Restore" : "Archive"}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="form-label grid gap-2 text-sm font-medium">
      {label}
      <input
        className="portfolio-input rounded-xl border px-3 py-2 font-normal outline-none"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={200}
      />
    </label>
  );
}
