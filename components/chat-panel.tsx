"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useQuery } from "convex/react";
import { ChevronLeft, LayoutTemplate, MessageSquareText, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatPanelProps = {
  cvId?: string;
};

type PanelView = "chat" | "templates";

type TemplateKind = "classic" | "styled";

type TemplatePreviewVariant =
  | "single-column"
  | "two-column"
  | "compact"
  | "editorial"
  | "gradient"
  | "timeline";

type CvTemplate = {
  id: string;
  name: string;
  kind: TemplateKind;
  variant: TemplatePreviewVariant;
};

const CV_TEMPLATES: CvTemplate[] = [
  { id: "classic-clean", name: "Classic Clean", kind: "classic", variant: "single-column" },
  { id: "classic-pro", name: "Classic Pro", kind: "classic", variant: "two-column" },
  { id: "classic-compact", name: "Classic Compact", kind: "classic", variant: "compact" },
  { id: "editorial", name: "Editorial", kind: "styled", variant: "editorial" },
  { id: "aurora", name: "Aurora", kind: "styled", variant: "gradient" },
  { id: "timeline", name: "Timeline", kind: "styled", variant: "timeline" },
];

type ResumePreviewData = {
  name: string;
  role: string;
  summary: string;
  contact: {
    email: string;
    phone: string;
    address?: string;
  };
  social: Array<{
    label: string;
    value: string;
  }>;
  labels: string[];
  skills: string[];
  experiences: string[];
  notes: string[];
};

type AppLocale = "en" | "es";

const DEFAULT_RESUME_DATA: Record<AppLocale, ResumePreviewData> = {
  en: {
    name: "Alex Martinez",
    role: "Senior Product Designer",
    summary:
      "Design professional focused on shipping measurable UX improvements across SaaS products.",
    contact: {
      email: "alex.martinez@email.com",
      phone: "+1 (305) 555-0148",
      address: "Miami, FL",
    },
    social: [
      { label: "LinkedIn", value: "linkedin.com/in/alexmartinez" },
      { label: "GitHub", value: "github.com/alexmartinez" },
    ],
    labels: ["Product Design", "Design Systems", "UX Research", "Accessibility"],
    skills: [
      "Figma",
      "Framer",
      "Design tokens",
      "A/B testing",
      "Information architecture",
      "Stakeholder management",
    ],
    experiences: [
      "Lead redesign for B2B onboarding flow and improved activation by 19%.",
      "Built and governed a shared component library used by 4 product squads.",
      "Defined UX research cadence with PM and data teams for quarterly roadmaps.",
      "Partnered with engineering to reduce handoff cycle time from 8 days to 3 days.",
    ],
    notes: [
      "Open to remote and hybrid roles.",
      "Portfolio available on request.",
    ],
  },
  es: {
    name: "Alex Martinez",
    role: "Disenador/a Senior de Producto",
    summary:
      "Perfil de diseno orientado a lanzar mejoras de UX con impacto medible en productos SaaS.",
    contact: {
      email: "alex.martinez@email.com",
      phone: "+1 (305) 555-0148",
      address: "Miami, FL",
    },
    social: [
      { label: "LinkedIn", value: "linkedin.com/in/alexmartinez" },
      { label: "GitHub", value: "github.com/alexmartinez" },
    ],
    labels: ["Diseno de producto", "Design systems", "Investigacion UX", "Accesibilidad"],
    skills: [
      "Figma",
      "Framer",
      "Design tokens",
      "Pruebas A/B",
      "Arquitectura de informacion",
      "Gestion con stakeholders",
    ],
    experiences: [
      "Lidere el rediseno del onboarding B2B y subi la activacion en 19%.",
      "Cree una libreria de componentes compartida para 4 squads de producto.",
      "Defini ciclos de investigacion UX junto con PM y equipo de datos.",
      "Reduje el tiempo de handoff con ingenieria de 8 dias a 3 dias.",
    ],
    notes: [
      "Disponible para remoto e hibrido.",
      "Portafolio disponible bajo solicitud.",
    ],
  },
};

function splitLines(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanMarkdownLine(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/`/g, "")
    .trim();
}

function toResumePreviewData(
  cv: Doc<"cvs"> | null | undefined,
  locale: AppLocale
): ResumePreviewData {
  const base = DEFAULT_RESUME_DATA[locale];

  if (!cv) return base;

  const markdownLines = splitLines(cv.description)
    .map(cleanMarkdownLine)
    .filter(Boolean);
  const summary = markdownLines[0] ?? base.summary;
  const experiences =
    markdownLines.slice(1, 5).length > 0
      ? markdownLines.slice(1, 5)
      : markdownLines.length > 0
        ? markdownLines.slice(0, 4)
        : base.experiences;
  const notes = markdownLines.slice(5, 10);

  return {
    name: base.name,
    role: base.role,
    summary,
    contact: base.contact,
    social: base.social,
    labels: base.labels,
    skills: base.skills,
    experiences,
    notes: notes.length > 0 ? notes : base.notes,
  };
}

function TemplatePreview({ variant }: { variant: TemplatePreviewVariant }) {
  if (variant === "two-column") {
    return (
      <div className="mx-auto aspect-[3/4] w-full max-w-[176px] rounded-xl border border-border bg-surface p-2">
        <div className="grid h-full grid-cols-[0.34fr_0.66fr] gap-2">
          <div className="rounded-md bg-muted p-1.5">
            <div className="mb-1.5 h-2.5 w-8 rounded bg-muted-foreground/35" />
            <div className="space-y-1">
              <div className="h-1.5 rounded bg-muted-foreground/25" />
              <div className="h-1.5 w-5/6 rounded bg-muted-foreground/25" />
              <div className="h-1.5 w-2/3 rounded bg-muted-foreground/25" />
            </div>
          </div>
          <div className="space-y-1.5 rounded-md border border-border/80 p-1.5">
            <div className="h-2.5 w-2/5 rounded bg-foreground/20" />
            <div className="h-1.5 rounded bg-foreground/12" />
            <div className="h-1.5 w-11/12 rounded bg-foreground/12" />
            <div className="h-1.5 w-5/6 rounded bg-foreground/12" />
            <div className="mt-2 h-2 w-1/3 rounded bg-foreground/18" />
            <div className="h-1.5 rounded bg-foreground/12" />
            <div className="h-1.5 w-4/5 rounded bg-foreground/12" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="mx-auto aspect-[3/4] w-full max-w-[176px] rounded-xl border border-border bg-surface p-2">
        <div className="space-y-1.5 rounded-md border border-border/80 p-2">
          <div className="h-2.5 w-2/5 rounded bg-foreground/20" />
          <div className="grid grid-cols-2 gap-1.5">
            <div className="h-1.5 rounded bg-foreground/12" />
            <div className="h-1.5 rounded bg-foreground/12" />
          </div>
          <div className="h-1.5 rounded bg-foreground/12" />
          <div className="h-1.5 w-5/6 rounded bg-foreground/12" />
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="h-1.5 rounded bg-muted-foreground/28" />
            <div className="h-1.5 rounded bg-muted-foreground/28" />
            <div className="h-1.5 rounded bg-muted-foreground/28" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <div className="mx-auto aspect-[3/4] w-full max-w-[176px] rounded-xl border border-border bg-surface p-2">
        <div className="h-full rounded-md border border-border/70 p-2">
          <div className="mb-1.5 h-2.5 w-1/2 rounded bg-foreground/20" />
          <div className="mb-2 h-px w-full bg-border" />
          <div className="grid h-[calc(100%-20px)] grid-cols-[0.62fr_0.38fr] gap-2">
            <div className="space-y-1">
              <div className="h-1.5 rounded bg-foreground/12" />
              <div className="h-1.5 rounded bg-foreground/12" />
              <div className="h-1.5 w-5/6 rounded bg-foreground/12" />
              <div className="pt-1">
                <div className="h-1.5 rounded bg-foreground/12" />
              </div>
            </div>
            <div className="rounded bg-muted p-1">
              <div className="h-1.5 rounded bg-muted-foreground/28" />
              <div className="mt-1 h-1.5 w-5/6 rounded bg-muted-foreground/28" />
              <div className="mt-2 h-1.5 w-2/3 rounded bg-muted-foreground/28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "gradient") {
    return (
      <div className="mx-auto aspect-[3/4] w-full max-w-[176px] rounded-xl border border-border bg-surface p-2">
        <div className="h-full rounded-md border border-border/70 bg-[linear-gradient(145deg,rgba(123,82,255,0.18),rgba(43,131,222,0.14)_45%,transparent_75%)] p-2 dark:bg-[linear-gradient(145deg,rgba(143,116,255,0.28),rgba(59,145,240,0.2)_45%,transparent_75%)]">
          <div className="mb-1.5 h-2.5 w-2/5 rounded bg-foreground/22" />
          <div className="space-y-1">
            <div className="h-1.5 rounded bg-foreground/14" />
            <div className="h-1.5 w-11/12 rounded bg-foreground/14" />
            <div className="h-1.5 w-4/5 rounded bg-foreground/14" />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <div className="h-4 rounded bg-surface/70" />
            <div className="h-4 rounded bg-surface/70" />
            <div className="h-4 rounded bg-surface/70" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "timeline") {
    return (
      <div className="mx-auto aspect-[3/4] w-full max-w-[176px] rounded-xl border border-border bg-surface p-2">
        <div className="grid h-full grid-cols-[10px_1fr] gap-2 rounded-md border border-border/70 p-2">
          <div className="relative">
            <div className="absolute left-1/2 top-1 h-[calc(100%-8px)] w-px -translate-x-1/2 bg-border" />
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/35" />
            <div className="mt-4 h-1.5 w-1.5 rounded-full bg-foreground/35" />
            <div className="mt-4 h-1.5 w-1.5 rounded-full bg-foreground/35" />
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="h-1.5 w-1/2 rounded bg-foreground/16" />
              <div className="h-1.5 rounded bg-foreground/12" />
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-2/5 rounded bg-foreground/16" />
              <div className="h-1.5 w-11/12 rounded bg-foreground/12" />
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-1/3 rounded bg-foreground/16" />
              <div className="h-1.5 w-3/4 rounded bg-foreground/12" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto aspect-[3/4] w-full max-w-[176px] rounded-xl border border-border bg-surface p-2">
      <div className="h-full rounded-md border border-border/80 p-2">
        <div className="mb-1.5 h-2.5 w-2/5 rounded bg-foreground/20" />
        <div className="space-y-1">
          <div className="h-1.5 rounded bg-foreground/12" />
          <div className="h-1.5 rounded bg-foreground/12" />
          <div className="h-1.5 w-10/12 rounded bg-foreground/12" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="h-5 rounded bg-muted" />
          <div className="h-5 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function TemplateFullPreview({
  variant,
  data,
}: {
  variant: TemplatePreviewVariant;
  data: ResumePreviewData;
}) {
  const topLabels = data.labels.slice(0, 6);
  const topSkills = data.skills.slice(0, 8);
  const topExperiences = data.experiences.slice(0, 4);
  const topNotes = data.notes.slice(0, 3);

  if (variant === "two-column") {
    type ClassicProTimelineItem = {
      period: string;
      location: string;
      company: string;
      role: string;
      description: string;
    };

    const nameParts = data.name.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? data.name;
    const lastName = nameParts.slice(1).join(" ");
    const aboutParagraphs = [data.summary, ...data.notes].filter(Boolean).slice(0, 2);
    const timelineSource = data.experiences.length > 0 ? data.experiences : [data.summary];
    const timelineEntries: ClassicProTimelineItem[] = timelineSource.map((description, index) => {
      const startYear = 2019 + index;
      const labelAsCompany = data.labels[index % Math.max(1, data.labels.length)] ?? data.role;
      return {
        period: `${startYear} - ${startYear + 1}`,
        location: data.contact.address ?? "Remote",
        company: labelAsCompany,
        role: data.role,
        description,
      };
    });

    const timelineChunks: ClassicProTimelineItem[][] = [];
    const entriesPerPage = 3;
    for (let index = 0; index < timelineEntries.length; index += entriesPerPage) {
      timelineChunks.push(timelineEntries.slice(index, index + entriesPerPage));
    }

    const firstPageTimeline = timelineChunks[0] ?? [];
    const continuedTimelineChunks = timelineChunks.slice(1);
    if (continuedTimelineChunks.length === 0) {
      continuedTimelineChunks.push([]);
    }

    const expertiseItems = timelineEntries.slice(0, 5);
    const skillsForSidebar = data.skills.slice(0, 15);
    const socialLinks = data.social.slice(0, 3);
    const highlightItems =
      data.notes.length > 0
        ? data.notes.slice(0, 3).map((note, index) => ({
            title: note,
            description: data.experiences[index] ?? data.summary,
          }))
        : data.labels.slice(0, 3).map((label, index) => ({
            title: label,
            description: data.experiences[index] ?? data.summary,
          }));

    const pageFontStyle = {
      fontFamily: '"Poppins", "Montserrat", "Segoe UI", sans-serif',
    };

    const renderTimeline = (items: ClassicProTimelineItem[], keyPrefix: string) => (
      <div className="relative mt-6">
        <div className="absolute left-[10px] top-2 h-[calc(100%-8px)] w-[2px] bg-[#6f6f73]" />
        <div className="space-y-7">
          {items.map((item, index) => (
            <article key={`${keyPrefix}-${index}`} className="relative pl-10">
              <span className="absolute left-[11px] top-2 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-[#3a3a3f] bg-[#f3f3f3]" />
              <p className="text-[14px] font-semibold tracking-[0.015em] text-[#2f2f34]">{item.period}</p>
              <p className="text-[12px] leading-tight text-[#3f3f43]">{item.location}</p>
              <p className="mt-1 text-[19px] font-semibold leading-tight text-[#2f2f34]">{item.company}</p>
              <p className="text-[12px] font-medium text-[#3f3f43]">{item.role}</p>
              <p className="mt-2 text-[11px] leading-[1.55] text-[#5f5f64]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    );

    const renderSidebarHeading = (label: string) => (
      <div>
        <h3 className="text-[16px] font-semibold leading-tight text-[#f2f2f2]">{label}</h3>
        <div className="mt-2 h-px bg-[#d4d4d4]/90" />
      </div>
    );

    return (
      <div className="mx-auto flex w-fit flex-col gap-6 pb-3">
        <article
          className="grid h-[1123px] w-[794px] grid-cols-[272px_1fr] overflow-hidden border border-[#2f2f34] bg-[#f3f3f3] shadow-[0_24px_55px_rgba(0,0,0,0.2)]"
          style={pageFontStyle}
        >
          <aside className="h-full bg-[#2f2f34] px-10 py-12 text-[#f3f3f3]">
            <div className="mx-auto h-40 w-40 rounded-full bg-[#4a4a4f]" />

            <section className="mt-12">
              {renderSidebarHeading("Contact")}
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-[12px] font-semibold leading-none">Phone</p>
                  <p className="mt-1 text-[11px] leading-tight text-[#ededed]">{data.contact.phone}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-none">Email</p>
                  <p className="mt-1 text-[11px] leading-tight text-[#ededed]">{data.contact.email}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-none">Address</p>
                  <p className="mt-1 text-[11px] leading-tight text-[#ededed]">
                    {data.contact.address ?? "Remote"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-12">
              {renderSidebarHeading("Expertise")}
              <div className="mt-6 space-y-6">
                {expertiseItems.map((item) => (
                  <div key={`${item.period}-${item.company}`}>
                    <p className="text-[11px] font-medium leading-none text-[#f0f0f0]">
                      {item.period.split(" - ")[0]}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold leading-tight">{item.company}</p>
                    <p className="text-[11px] leading-tight text-[#e7e7e7]">{item.role}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12">
              {renderSidebarHeading("Languages")}
              <ul className="mt-6 space-y-3 pl-5 text-[11px] leading-tight">
                <li>Spanish - Native</li>
                <li>English - C2</li>
              </ul>
            </section>
          </aside>

          <div className="h-full bg-[#f3f3f3] px-9 py-12 text-[#2f2f34]">
            <header>
              <h1 className="leading-[0.92] tracking-[0.01em]">
                <span className="block text-[60px] font-bold">{firstName}</span>
                <span className="block text-[58px] font-medium">
                  {lastName || firstName}
                </span>
              </h1>
              <p className="mt-3 text-[27px] font-medium leading-tight">{data.role}</p>
            </header>

            <section className="mt-10">
              <h2 className="text-[36px] font-semibold leading-none">About me</h2>
              <div className="mt-2 h-px bg-[#6a6a6f]" />
              <div className="mt-4 space-y-4 text-[11px] leading-[1.55] text-[#5f5f64]">
                {aboutParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-[36px] font-semibold leading-none">Experience</h2>
              <div className="mt-2 h-px bg-[#6a6a6f]" />
              {renderTimeline(firstPageTimeline, "classic-pro-page-1")}
            </section>
          </div>
        </article>

        {continuedTimelineChunks.map((chunk, pageIndex) => {
          const isLastPage = pageIndex === continuedTimelineChunks.length - 1;

          return (
            <article
              key={`classic-pro-page-${pageIndex + 2}`}
              className="grid h-[1123px] w-[794px] grid-cols-[272px_1fr] overflow-hidden border border-[#2f2f34] bg-[#f3f3f3] shadow-[0_24px_55px_rgba(0,0,0,0.2)]"
              style={pageFontStyle}
            >
              <aside className="h-full bg-[#2f2f34] px-10 py-12 text-[#f3f3f3]">
                <section>
                  {renderSidebarHeading("Skills")}
                  <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5">
                    {skillsForSidebar.map((skill) => (
                      <div key={skill} className="text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#4f4f55] text-[11px] font-semibold">
                          {skill.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="mt-2 text-[10px] leading-tight text-[#efefef]">{skill}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-12">
                  {renderSidebarHeading("Social")}
                  <div className="mt-6 space-y-5">
                    {socialLinks.map((item) => (
                      <div key={item.value}>
                        <p className="text-[12px] font-semibold leading-none">{item.label}</p>
                        <p className="mt-1 text-[10px] leading-tight underline decoration-[#d8d8d8] underline-offset-2">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>

              <div className="h-full bg-[#f3f3f3] px-9 py-12 text-[#2f2f34]">
                <section>
                  {renderTimeline(chunk, `classic-pro-page-${pageIndex + 2}`)}
                </section>

                {isLastPage ? (
                  <section className="mt-8">
                    <h2 className="text-[36px] font-semibold leading-none">Highlights</h2>
                    <div className="mt-2 h-px bg-[#6a6a6f]" />
                    <div className="mt-6 space-y-5">
                      {highlightItems.map((item) => (
                        <article key={item.title}>
                          <h3 className="text-[20px] font-semibold leading-tight">{item.title}</h3>
                          <p className="mt-1 text-[11px] leading-[1.55] text-[#5f5f64]">
                            {item.description}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <article className="mx-auto w-full max-w-[780px] rounded-2xl border border-border bg-white p-6 text-zinc-900 shadow-lg dark:bg-zinc-950 dark:text-zinc-100">
        <header className="rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{data.name}</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{data.role}</p>
            </div>
            <div className="grid gap-1 text-right text-xs text-zinc-600 dark:text-zinc-300">
              <span>{data.contact.email}</span>
              <span>{data.contact.phone}</span>
              {data.contact.address ? <span>{data.contact.address}</span> : null}
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Summary</h2>
            <p className="mt-2 text-sm leading-6">{data.summary}</p>
          </section>
          <section className="rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {topSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-zinc-200 px-2 py-1 text-xs dark:bg-zinc-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Experience Highlights</h2>
          <ul className="mt-2 grid gap-2 text-sm leading-6 md:grid-cols-2">
            {topExperiences.map((experience) => (
              <li key={experience} className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
                {experience}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Additional Notes</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {topNotes.map((note) => (
              <span key={note} className="rounded-full border border-zinc-300 px-2 py-1 dark:border-zinc-600">
                {note}
              </span>
            ))}
          </div>
        </section>
      </article>
    );
  }

  if (variant === "editorial") {
    return (
      <article className="mx-auto w-full max-w-[780px] border border-zinc-300 bg-[linear-gradient(180deg,#ffffff,#fafafa)] p-8 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-300 pb-5 dark:border-zinc-700">
          <p className="font-serif text-sm uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
            Curriculum Vitae
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none">{data.name}</h1>
          <p className="mt-3 text-sm uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {data.role}
          </p>
        </header>

        <div className="mt-6 grid gap-8 md:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <section>
              <h2 className="font-serif text-xl">Profile</h2>
              <p className="mt-2 text-sm leading-7">{data.summary}</p>
            </section>

            <section>
              <h2 className="font-serif text-xl">Experience</h2>
              <ol className="mt-3 space-y-4">
                {topExperiences.map((experience, index) => (
                  <li key={experience} className="border-l border-zinc-300 pl-4 dark:border-zinc-700">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                      Case {index + 1}
                    </p>
                    <p className="mt-1 text-sm leading-6">{experience}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-6">
            <section>
              <h2 className="font-serif text-xl">Contact</h2>
              <ul className="mt-2 space-y-2 text-sm">
                <li>{data.contact.email}</li>
                <li>{data.contact.phone}</li>
                {data.contact.address ? <li>{data.contact.address}</li> : null}
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl">Topics</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {topLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-sm border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl">Links</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {data.social.map((item) => (
                  <li key={item.value}>
                    <span className="font-medium">{item.label}: </span>
                    {item.value}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </article>
    );
  }

  if (variant === "gradient") {
    return (
      <article className="mx-auto w-full max-w-[780px] overflow-hidden rounded-2xl border border-sky-200 bg-[linear-gradient(140deg,#f8fcff_0%,#eef6ff_35%,#f9f7ff_100%)] p-7 text-slate-900 shadow-lg dark:border-sky-900 dark:bg-[linear-gradient(140deg,#101726_0%,#101c30_40%,#1a1630_100%)] dark:text-sky-50">
        <header className="rounded-xl bg-white/80 p-5 backdrop-blur dark:bg-sky-950/40">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
            Creative Profile
          </p>
          <h1 className="mt-2 text-3xl font-bold">{data.name}</h1>
          <p className="mt-1 text-sm text-sky-700 dark:text-sky-300">{data.role}</p>
          <p className="mt-3 text-sm leading-6">{data.summary}</p>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <section className="rounded-xl bg-white/80 p-4 backdrop-blur dark:bg-sky-950/40">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 dark:text-sky-300">
              Contact
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>{data.contact.email}</li>
              <li>{data.contact.phone}</li>
              {data.contact.address ? <li>{data.contact.address}</li> : null}
            </ul>
          </section>

          <section className="rounded-xl bg-white/80 p-4 backdrop-blur dark:bg-sky-950/40">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 dark:text-sky-300">
              Skills
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {topSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-sky-100 px-2 py-1 text-xs dark:bg-sky-900/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white/80 p-4 backdrop-blur dark:bg-sky-950/40">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 dark:text-sky-300">
              Links
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {data.social.map((item) => (
                <li key={item.value}>
                  <span className="font-semibold">{item.label}: </span>
                  {item.value}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-4 rounded-xl bg-white/80 p-5 backdrop-blur dark:bg-sky-950/40">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 dark:text-sky-300">
            Impact Highlights
          </h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 md:grid-cols-2">
            {topExperiences.map((experience) => (
              <li key={experience} className="rounded-lg bg-sky-100/80 px-3 py-2 dark:bg-sky-900/35">
                {experience}
              </li>
            ))}
          </ul>
        </section>
      </article>
    );
  }

  if (variant === "timeline") {
    return (
      <article className="mx-auto w-full max-w-[780px] rounded-2xl border border-border bg-white p-7 text-zinc-900 shadow-lg dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-300 pb-5 dark:border-zinc-700">
          <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{data.role}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {topLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-zinc-200 px-2.5 py-1 dark:bg-zinc-800"
              >
                {label}
              </span>
            ))}
          </div>
        </header>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_2.2fr]">
          <aside className="space-y-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
                Contact
              </h2>
              <ul className="mt-2 space-y-1 text-sm">
                <li>{data.contact.email}</li>
                <li>{data.contact.phone}</li>
                {data.contact.address ? <li>{data.contact.address}</li> : null}
              </ul>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
                Skills
              </h2>
              <ul className="mt-2 space-y-1 text-sm">
                {topSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </section>
          </aside>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
              Timeline
            </h2>
            <ol className="mt-3 space-y-4">
              {topExperiences.map((experience, index) => (
                <li key={experience} className="grid grid-cols-[22px_1fr] gap-3">
                  <div className="relative">
                    <div className="absolute left-1/2 top-2 h-full w-px -translate-x-1/2 bg-zinc-300 dark:bg-zinc-700" />
                    <span className="relative mt-1 block h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  </div>
                  <div className="rounded-xl border border-zinc-300 p-3 dark:border-zinc-700">
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 text-sm leading-6">{experience}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em]">Summary</h3>
              <p className="mt-2 text-sm leading-6">{data.summary}</p>
            </div>
          </section>
        </div>
      </article>
    );
  }

  return (
    <article className="mx-auto w-full max-w-[780px] rounded-2xl border border-border bg-white p-8 text-zinc-900 shadow-lg dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-300 pb-5 dark:border-zinc-700">
        <h1 className="text-4xl font-semibold tracking-tight">{data.name}</h1>
        <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">{data.role}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          <span>{data.contact.email}</span>
          <span>{data.contact.phone}</span>
          {data.contact.address ? <span>{data.contact.address}</span> : null}
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Professional Summary
        </h2>
        <p className="mt-2 text-sm leading-7">{data.summary}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Experience
        </h2>
        <ul className="mt-3 space-y-3 text-sm leading-6">
          {topExperiences.map((experience) => (
            <li key={experience} className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
              {experience}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Skills
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs dark:border-zinc-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Additional
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {topNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}

function normalizeAssistantMarkdown(content: string): string {
  const fencedBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const unwrapped = content.replace(fencedBlockRegex, (full, langRaw, innerRaw) => {
    const lang = String(langRaw ?? "").toLowerCase();
    const inner = String(innerRaw ?? "").trim();
    const allowedLang =
      !lang ||
      lang === "md" ||
      lang === "markdown" ||
      lang === "text" ||
      lang === "plaintext" ||
      lang === "plain";

    const hasMarkdownHeading = /(^|\n)\s{0,3}#{1,6}\s+\S/.test(inner);
    const hasMarkdownList = /(^|\n)\s{0,3}[-*+]\s+\S/.test(inner);
    const hasMarkdownTable =
      /\|/.test(inner) &&
      /(^|\n)\s*\|?.+\|.+\n\s*\|?\s*[:\-]{3,}[\s|:\-]*\|?\s*(\n|$)/.test(inner);

    if (allowedLang && (hasMarkdownHeading || hasMarkdownList || hasMarkdownTable)) {
      return inner;
    }

    return full;
  });

  const withSoftBreaks = unwrapped.replace(/<br\s*\/?>/gi, "\n");
  const lines = withSoftBreaks.split("\n");
  const normalized: string[] = [];
  let index = 0;

  const isPipeRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
  const isSeparatorRow = (line: string) =>
    /^\s*\|?\s*[:\-]{3,}[\s|:\-]*\|?\s*$/.test(line);
  const getCells = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  while (index < lines.length) {
    const line = lines[index];

    if (!isPipeRow(line)) {
      normalized.push(line);
      index += 1;
      continue;
    }

    let cursor = index;
    const block: string[] = [];

    while (cursor < lines.length) {
      const candidate = lines[cursor];
      if (candidate.trim() === "" || isPipeRow(candidate) || isSeparatorRow(candidate)) {
        block.push(candidate);
        cursor += 1;
        continue;
      }
      break;
    }

    const hasSeparator = block.some((item) => isSeparatorRow(item));
    const rowCount = block.filter((item) => isPipeRow(item)).length;

    if (hasSeparator && rowCount >= 2) {
      const compacted = block
        .filter((item) => item.trim() !== "")
        .map((item) => item.replace(/\s+$/, ""));

      const separatorIndex = compacted.findIndex((item) => isSeparatorRow(item));
      let headerLine = "";

      if (separatorIndex > 0) {
        for (let i = separatorIndex - 1; i >= 0; i -= 1) {
          if (isPipeRow(compacted[i])) {
            headerLine = compacted[i];
            break;
          }
        }
      }

      const headerCols = headerLine ? getCells(headerLine).length : 0;
      let tableLines = compacted;
      let trailingNote = "";

      if (headerCols > 1 && separatorIndex > 0) {
        const trailingSparseRows: string[] = [];
        let trailingCursor = compacted.length - 1;

        while (trailingCursor > separatorIndex) {
          const candidate = compacted[trailingCursor];
          if (!isPipeRow(candidate)) break;

          const cells = getCells(candidate);
          const nonEmpty = cells.filter((cell) => cell.length > 0);

          if (cells.length <= headerCols && nonEmpty.length === 1) {
            trailingSparseRows.unshift(candidate);
            trailingCursor -= 1;
            continue;
          }

          break;
        }

        const shouldSplitTrailingNote =
          trailingSparseRows.length >= 2 ||
          (trailingSparseRows.length === 1 &&
            (getCells(trailingSparseRows[0]).find((cell) => cell.length > 0)?.length ?? 0) >
              60);

        if (shouldSplitTrailingNote) {
          tableLines = compacted.slice(0, compacted.length - trailingSparseRows.length);
          trailingNote = trailingSparseRows
            .map((row) => getCells(row).find((cell) => cell.length > 0) ?? "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        }
      }

      normalized.push(...tableLines);

      if (trailingNote) {
        normalized.push("");
        normalized.push(trailingNote);
      }

      index = cursor;
      continue;
    }

    normalized.push(line);
    index += 1;
  }

  return normalized.join("\n");
}

function parseLocale(value?: string): "en" | "es" {
  if (!value) return "en";
  return value.toLowerCase().startsWith("es") ? "es" : "en";
}

async function parseApiError(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? null;
  } catch {
    return null;
  }
}

export function ChatPanel({ cvId }: ChatPanelProps) {
  const BOTTOM_SCROLL_THRESHOLD = 80;
  const MAX_PROMPT_ROWS = 5;
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<PanelView>("chat");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messageListRef] = useAutoAnimate<HTMLDivElement>({
    duration: 260,
    easing: "ease-out",
  });
  const [templateListRef] = useAutoAnimate<HTMLDivElement>({
    duration: 260,
    easing: "ease-out",
  });
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const canWrite = Boolean(cvId);
  const locale = useMemo(() => parseLocale(i18n.resolvedLanguage), [i18n.resolvedLanguage]);
  const currentCv = useQuery(
    api.cvs.getById,
    cvId ? { cvId: cvId as Id<"cvs"> } : "skip"
  );
  const previewData = useMemo(
    () => toResumePreviewData(currentCv, locale),
    [currentCv, locale]
  );
  const selectedTemplate = useMemo(
    () => CV_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId]
  );
  const setMessageContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      messageListRef(node);
      scrollContainerRef.current = node;
    },
    [messageListRef]
  );

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    listEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  function isNearBottom(element: HTMLDivElement): boolean {
    const distanceToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceToBottom <= BOTTOM_SCROLL_THRESHOLD;
  }

  const resizePromptTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * MAX_PROMPT_ROWS + paddingTop + paddingBottom + borderTop + borderBottom;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    if (textarea.scrollHeight <= maxHeight) {
      textarea.scrollTop = 0;
    }
  }, [MAX_PROMPT_ROWS]);

  useEffect(() => {
    const initialMessage: ChatMessage = {
      id: `assistant-initial-${cvId ?? "home"}-${locale}`,
      role: "assistant",
      content: cvId ? t("home.initialCvMessage") : t("home.selectCvMessage"),
    };

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setMessages([initialMessage]);
    setPrompt("");
    setIsStreaming(false);
    shouldAutoScrollRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      inputRef.current?.focus();
    });
  }, [cvId, locale, t]);

  useEffect(() => {
    resizePromptTextarea();
  }, [prompt, resizePromptTextarea]);

  useEffect(() => {
    setSelectedTemplateId(null);
  }, [cvId]);

  useEffect(() => {
    if (activeView !== "chat") return;
    if (!shouldAutoScrollRef.current) return;
    scrollToBottom("smooth");
  }, [messages, isStreaming, activeView]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  async function handleSendMessage() {
    const text = prompt.trim();
    if (!text || isStreaming) return;

    if (!canWrite || !cvId) {
      toast.error(t("home.chatFailedTitle"), {
        description: t("home.writeOnlyOnCvRoute"),
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    const nextMessagesForApi = [...messages, userMessage].map(({ role, content }) => ({
      role,
      content,
    }));

    setPrompt("");
    setIsStreaming(true);
    shouldAutoScrollRef.current = true;
    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      inputRef.current?.focus();
    });

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          cvId,
          locale,
          messages: nextMessagesForApi,
        }),
      });

      if (!response.ok) {
        const apiError = await parseApiError(response);
        throw new Error(apiError ?? t("home.chatFailedUnexpected"));
      }

      if (!response.body) {
        throw new Error(t("home.chatEmptyResponse"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        fullResponse += chunk;

        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: fullResponse }
              : message
          )
        );
      }

      if (!fullResponse.trim()) {
        throw new Error(t("home.chatEmptyResponse"));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessages((previous) =>
        previous.filter((message) => message.id !== assistantMessage.id)
      );

      const description =
        error instanceof Error && error.message
          ? error.message
          : t("home.chatFailedNetwork");

      toast.error(t("home.chatFailedTitle"), {
        description,
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent_48%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_42%)]" />

      <TooltipProvider>
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 md:left-6 md:top-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={activeView === "chat" ? "secondary" : "outline"}
                size="icon"
                aria-label={t("home.viewChat")}
                title={t("home.viewChat")}
                aria-pressed={activeView === "chat"}
                onClick={() => setActiveView("chat")}
                className="h-9 w-9 rounded-lg"
              >
                <MessageSquareText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("home.viewChat")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={activeView === "templates" ? "secondary" : "outline"}
                size="icon"
                aria-label={t("home.viewTemplates")}
                title={t("home.viewTemplates")}
                aria-pressed={activeView === "templates"}
                onClick={() => {
                  setActiveView("templates");
                  setSelectedTemplateId(null);
                }}
                className="h-9 w-9 rounded-lg"
              >
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("home.viewTemplates")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div
        className={cn(
          "relative mx-auto flex min-h-0 w-full flex-1 flex-col px-4 pb-4 pt-16 md:pb-6 md:pt-20",
          activeView === "templates" ? "max-w-[1100px]" : "max-w-[850px]"
        )}
      >
        {activeView === "chat" ? (
          <>
            <div
              ref={setMessageContainerRef}
              onScroll={() => {
                const element = scrollContainerRef.current;
                if (!element) return;
                shouldAutoScrollRef.current = isNearBottom(element);
              }}
              className="chat-scroll min-h-0 flex-1 space-y-5 overflow-y-auto pr-3 md:pr-4"
            >
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div
                      className={cn(
                        "w-fit max-w-[80%] break-words rounded-3xl rounded-tr-lg bg-muted px-5 py-3 text-[15px] leading-8 text-foreground animate-fade-in-up",
                        "dark:bg-[#2a2d33]"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="w-full animate-fade-in-up">
                    <div className="markdown-body text-[17px] leading-9 text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {normalizeAssistantMarkdown(message.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              )}

              {isStreaming ? (
                <div className="flex items-center gap-2 pl-1 text-muted-foreground animate-fade-in-up">
                  <span className="typing-dot-md" />
                  <span className="typing-dot-md" style={{ animationDelay: "180ms" }} />
                  <span className="typing-dot-md" style={{ animationDelay: "360ms" }} />
                </div>
              ) : null}

              <div ref={listEndRef} />
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-surface/85 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-2">
                <textarea
                  ref={inputRef}
                  autoFocus
                  rows={1}
                  wrap="soft"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={t("home.promptPlaceholder")}
                  disabled={!canWrite}
                  className="max-h-none min-h-12 w-full resize-none rounded-3xl border border-transparent bg-transparent px-4 py-3 text-base leading-6 text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-70"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full transition-transform duration-200 hover:scale-[1.03]"
                    onClick={() => void handleSendMessage()}
                    disabled={!canWrite || isStreaming || !prompt.trim()}
                    aria-label={t("home.sendButton")}
                    title={t("home.sendButton")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!canWrite ? (
                <p className="px-4 pt-2 text-xs text-muted-foreground">
                  {t("home.writeOnlyOnCvRoute")}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1">
            {selectedTemplate ? (
              <>
                <div className="mb-4 animate-fade-in-up">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {t("home.templatesPreviewTitle", { defaultValue: "Template Preview" })}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("home.templatesPreviewSubtitle", {
                          defaultValue:
                            "The same resume data is rendered with a different structure per template.",
                        })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setSelectedTemplateId(null)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("home.templatesBackButton", { defaultValue: "Back to templates" })}
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CV_TEMPLATES.map((template) => (
                      <Button
                        key={template.id}
                        type="button"
                        size="sm"
                        variant={selectedTemplate.id === template.id ? "secondary" : "outline"}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className="rounded-full"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="chat-scroll max-h-full min-h-0 overflow-auto pr-3 pb-2 md:pr-4">
                  <TemplateFullPreview variant={selectedTemplate.variant} data={previewData} />
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 animate-fade-in-up">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {t("home.templatesTitle", { defaultValue: "CV Templates" })}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("home.templatesSubtitle", {
                      defaultValue:
                        "Select any template to open a full preview with the same resume information.",
                    })}
                  </p>
                </div>

                <div
                  ref={templateListRef}
                  className="chat-scroll grid max-h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-3 pb-2 md:grid-cols-2 md:pr-4 lg:grid-cols-3"
                >
                  {CV_TEMPLATES.map((template, index) => (
                    <button
                      key={template.id}
                      type="button"
                      className="animate-fade-in-up rounded-2xl border border-border bg-surface/90 p-3 text-left shadow-sm backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-surface"
                      style={{ animationDelay: `${index * 45}ms` }}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <TemplatePreview variant={template.variant} />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {template.kind === "classic"
                              ? t("home.templateKindClassic")
                              : t("home.templateKindStyled")}
                          </p>
                        </div>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {t("home.templatesPreviewAction", { defaultValue: "Preview" })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
