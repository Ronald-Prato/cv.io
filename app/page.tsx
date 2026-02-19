"use client";

import { type DragEvent, useEffect, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useAction, useMutation } from "convex/react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [hasUploadedCv, setHasUploadedCv] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const dragDepthRef = useRef(0);
  const pendingReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveUploadedCv = useMutation(api.files.saveUploadedCv);
  const parseUploadedPdfToCv = useAction(api.cvParser.parseUploadedPdfToCv);
  const hasMessages = messages.length > 0;
  const hasPdf = selectedPdf !== null;
  const canAcceptPdf = !hasPdf && !hasUploadedCv && !hasMessages;
  const [messageListRef] = useAutoAnimate<HTMLDivElement>({
    duration: 260,
    easing: "ease-out",
  });
  const [composerRef] = useAutoAnimate<HTMLDivElement>({
    duration: 220,
    easing: "ease-out",
  });

  const uploadedLabel = hasPdf ? selectedPdf.name : t("home.attachPdfLabel");

  useEffect(() => {
    return () => {
      if (pendingReplyTimerRef.current) {
        clearTimeout(pendingReplyTimerRef.current);
      }
    };
  }, []);

  function pushMessage(role: ChatMessage["role"], content: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
      },
    ]);
  }

  function addFiles(files: FileList | null) {
    if (!canAcceptPdf) return;
    if (!files) return;
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === "application/pdf"
    );
    if (pdfFiles.length === 0) return;
    setSelectedPdf(pdfFiles[0]);
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    if (!canAcceptPdf) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!canAcceptPdf) return;
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!canAcceptPdf) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }

  function handleSendMessage() {
    const text = prompt.trim();
    if (!text) return;

    if (pendingReplyTimerRef.current) {
      clearTimeout(pendingReplyTimerRef.current);
    }

    pushMessage("user", text);
    setPrompt("");
    setIsAssistantTyping(true);

    pendingReplyTimerRef.current = setTimeout(() => {
      pushMessage("assistant", t("home.assistantAutoReply"));
      setIsAssistantTyping(false);
      pendingReplyTimerRef.current = null;
    }, 700);
  }

  async function handleUploadCv() {
    if (!selectedPdf || isUploading) return;

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedPdf.type || "application/pdf",
        },
        body: selectedPdf,
      });

      if (!uploadResponse.ok) {
        throw new Error(t("home.uploadFailed"));
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };
      const uploadId = await saveUploadedCv({
        storageId,
        fileName: selectedPdf.name,
        fileType: selectedPdf.type || "application/pdf",
        fileSize: selectedPdf.size,
      });
      await parseUploadedPdfToCv({ uploadId });

      toast.success(t("home.uploadAndParseSuccess"));
      pushMessage("assistant", t("home.uploadCompleteMessage"));
      setHasUploadedCv(true);
      setSelectedPdf(null);
    } catch (error) {
      console.error(error);
      toast.error(t("home.uploadError"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <main className="flex h-screen w-full overflow-hidden border border-border bg-surface shadow-sm">
        <Sidebar />

        <section
          onDragEnter={canAcceptPdf ? handleDragEnter : undefined}
          onDragOver={canAcceptPdf ? (event) => event.preventDefault() : undefined}
          onDragLeave={canAcceptPdf ? handleDragLeave : undefined}
          onDrop={canAcceptPdf ? handleDrop : undefined}
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent_48%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_42%)]" />

          {!hasMessages ? (
            <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-4 pb-16 sm:px-6 lg:px-8 animate-fade-in-up">
              <h1 className="mb-8 text-center text-3xl font-medium tracking-tight text-foreground/95 sm:text-4xl transition-all duration-300">
                {hasPdf ? t("home.titleReady") : t("home.titleQuestion")}
              </h1>

              <div
                className={cn(
                  "rounded-3xl border bg-surface/75 shadow-lg backdrop-blur-sm transition-all duration-300",
                  dragActive ? "border-primary ring-2 ring-primary/30" : "border-border"
                )}
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                  {canAcceptPdf ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-muted">
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf"
                        disabled={isUploading || !canAcceptPdf}
                        onChange={(event) => addFiles(event.target.files)}
                      />
                      <span className="text-base leading-none">+</span>
                      <span>{t("home.uploadPdfButton")}</span>
                    </label>
                  ) : null}
                  <p className="truncate text-sm text-muted-foreground">{uploadedLabel}</p>
                  {canAcceptPdf && dragActive && (
                    <span className="ml-auto text-xs font-medium text-primary">
                      {t("home.dropFileHint")}
                    </span>
                  )}
                </div>

                {!hasPdf ? (
                  <div ref={composerRef} className="flex items-center gap-2 p-3">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={t("home.promptPlaceholder")}
                      className="h-12 w-full rounded-full border border-transparent bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full transition-transform duration-200 hover:scale-[1.03]"
                      onClick={handleSendMessage}
                    >
                      {t("home.sendButton")}
                    </Button>
                  </div>
                ) : (
                  <div
                    ref={composerRef}
                    className="flex flex-col gap-4 p-4 animate-pop-in sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-200">
                        PDF
                      </div>
                      <p className="truncate text-sm font-medium text-foreground">
                        {selectedPdf.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="h-10 rounded-full px-5 transition-transform duration-200 hover:scale-[1.02]"
                      disabled={isUploading}
                      onClick={handleUploadCv}
                    >
                      {isUploading ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          {t("home.uploading")}
                        </>
                      ) : (
                        t("home.uploadCv")
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {canAcceptPdf ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {t("home.dragAndDropHint")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col px-5 py-4 md:px-7 md:py-6">
              <div
                ref={messageListRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 animate-fade-in-up",
                      message.role === "assistant"
                        ? "border-border bg-surface-elevated text-foreground"
                        : "ml-auto border-primary/30 bg-secondary text-secondary-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                {isAssistantTyping ? (
                  <div className="max-w-[88%] rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted-foreground animate-fade-in-up">
                    <span className="animate-pulse-soft">{t("home.assistantThinking")}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-surface/85 p-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={t("home.promptPlaceholder")}
                    className="h-12 w-full rounded-full border border-transparent bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full transition-transform duration-200 hover:scale-[1.03]"
                    onClick={handleSendMessage}
                  >
                    {t("home.sendButton")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
