"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStarted, setStreamStarted] = useState(false);
  const [messageListRef] = useAutoAnimate<HTMLDivElement>({
    duration: 260,
    easing: "ease-out",
  });
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canWrite = Boolean(cvId);
  const locale = useMemo(() => parseLocale(i18n.resolvedLanguage), [i18n.resolvedLanguage]);

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
    setStreamStarted(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [cvId, locale, t]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming, streamStarted]);

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
    setStreamStarted(false);
    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    requestAnimationFrame(() => {
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
        setStreamStarted(true);

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
      setStreamStarted(false);
      abortControllerRef.current = null;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent_48%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_42%)]" />

      <div className="relative mx-auto flex min-h-0 w-full max-w-[700px] flex-1 flex-col px-4 py-4 md:py-6">
        <div
          ref={messageListRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1"
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
      </div>
    </section>
  );
}
