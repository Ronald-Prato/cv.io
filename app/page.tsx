"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { H1, H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const myCvs = [
  "Senior Product Designer",
  "Frontend Engineer",
  "AI Product Manager",
  "Data Analyst",
];

const sampleMessages = [
  {
    role: "assistant",
    content:
      "Hola, puedo ayudarte a construir tu CV. Puedes subir un PDF con tu experiencia o contarme tu perfil en texto.",
  },
  {
    role: "user",
    content:
      "Quiero un CV para una posicion de Product Designer con foco en research y sistemas de diseno.",
  },
];

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const uploadedLabel = useMemo(() => {
    if (uploadedFiles.length === 0) return "No files uploaded yet.";
    if (uploadedFiles.length === 1) return uploadedFiles[0].name;
    return `${uploadedFiles.length} PDF files selected`;
  }, [uploadedFiles]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === "application/pdf"
    );
    setUploadedFiles((prev) => [...prev, ...pdfFiles]);
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <main className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1400px] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:h-[calc(100vh-2.5rem)]">
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-surface-elevated p-4 md:w-[320px] md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              CV
            </div>
            <div>
              <p className="font-semibold text-foreground">cv.io</p>
              <Muted className="text-xs">AI resume workspace</Muted>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-medium text-foreground">Jane Cooper</p>
            <Muted className="mt-0.5 text-xs">jane@cv.io</Muted>
          </div>

          <div className="my-5 h-px bg-border" />

          <div className="mb-3 flex items-center justify-between gap-2">
            <H2 className="text-lg">My CVs</H2>
            <Button size="sm">New</Button>
          </div>

          <div className="space-y-2">
            {myCvs.map((cv) => (
              <button
                key={cv}
                type="button"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                {cv}
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-lg border border-border bg-surface p-3">
            <Muted className="text-xs">
              Tip: Upload an existing CV in PDF and I will extract your
              experience automatically.
            </Muted>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border px-5 py-4 md:px-7">
            <div className="flex items-center justify-between gap-4">
              <H1 className="text-2xl">Interactive CV Chat</H1>
              <Button>Start New Chat</Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4 md:px-7 md:py-6">
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                addFiles(event.dataTransfer.files);
              }}
              className={cn(
                "mb-5 rounded-2xl border bg-linear-to-r p-6 md:p-8",
                dragActive
                  ? "border-primary from-brand-600 to-sky-300 text-primary-foreground"
                  : "border-border from-brand-200 via-brand-100 to-sky-100"
              )}
            >
              <p className="text-2xl font-semibold tracking-tight">
                Welcome back, Jane
              </p>
              <p className="mt-2 text-sm opacity-85">
                Drop PDF files here or use the upload button below to import
                your existing resume.
              </p>
            </div>

            <div className="mb-4 space-y-3 overflow-y-auto pr-1">
              {sampleMessages.map((message, idx) => (
                <div
                  key={`${message.role}-${idx}`}
                  className={cn(
                    "max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6",
                    message.role === "assistant"
                      ? "border-border bg-surface-elevated text-foreground"
                      : "ml-auto border-primary/30 bg-secondary text-secondary-foreground"
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>

            <div className="mt-auto space-y-3 rounded-xl border border-border bg-surface-elevated p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{uploadedLabel}</p>
                <label className="inline-flex cursor-pointer items-center">
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    multiple
                    onChange={(event) => addFiles(event.target.files)}
                  />
                  <span className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-muted">
                    Upload PDF
                  </span>
                </label>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Textarea
                  placeholder="Write your message... Example: create a CV focused on Product Design and leadership."
                  className="min-h-24 bg-surface"
                />
                <div className="flex items-end">
                  <Button className="w-full md:w-auto">Send</Button>
                </div>
              </div>
              <Input
                type="text"
                placeholder="Optional: paste a job description URL..."
                className="bg-surface"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
