"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { LayoutTemplate, MessageSquareText, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<PanelView>("chat");
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const canWrite = Boolean(cvId);
  const locale = useMemo(() => parseLocale(i18n.resolvedLanguage), [i18n.resolvedLanguage]);
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
                onClick={() => setActiveView("templates")}
                className="h-9 w-9 rounded-lg"
              >
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("home.viewTemplates")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[850px] flex-1 flex-col px-4 pb-4 pt-16 md:pb-6 md:pt-20">
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
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={t("home.promptPlaceholder")}
                  disabled={!canWrite}
                  className="h-12 w-full rounded-full border border-transparent bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-70"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full transition-transform duration-200 hover:scale-[1.03]"
                  onClick={() => void handleSendMessage()}
                  disabled={!canWrite || isStreaming || !prompt.trim()}
                  aria-label={t("home.sendButton")}
                  title={t("home.sendButton")}
                >
                  <Send className="h-4 w-4" />
                </Button>
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
            <div className="mb-4 animate-fade-in-up">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {t("home.templatesTitle", { defaultValue: "CV Templates" })}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("home.templatesSubtitle", {
                  defaultValue:
                    "Preview classic and styled resume layouts. Selection actions are coming soon.",
                })}
              </p>
            </div>

            <div
              ref={templateListRef}
              className="chat-scroll grid max-h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-3 pb-2 md:grid-cols-2 md:pr-4 lg:grid-cols-3"
            >
              {CV_TEMPLATES.map((template, index) => (
                <article
                  key={template.id}
                  className="animate-fade-in-up rounded-2xl border border-border bg-surface/90 p-3 shadow-sm backdrop-blur-sm"
                  style={{ animationDelay: `${index * 45}ms` }}
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
                      {t("home.templatesComingSoon", { defaultValue: "Soon" })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
