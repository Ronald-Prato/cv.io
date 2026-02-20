"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { FileUp, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeUploadDropzone() {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveUploadedCv = useMutation(api.files.saveUploadedCv);
  const parseUploadedPdfToCv = useAction(api.cvParser.parseUploadedPdfToCv);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function uploadFile(file: File) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      toast.error(t("home.uploadError"), {
        description: t("home.invalidFileType"),
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl({});

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(t("home.uploadFailed"));
      }

      const uploadResult = (await uploadResponse.json()) as { storageId?: string };
      if (!uploadResult.storageId) {
        throw new Error(t("home.uploadError"));
      }

      const uploadId = await saveUploadedCv({
        storageId: uploadResult.storageId as Id<"_storage">,
        fileName: file.name,
        fileType: file.type || "application/pdf",
        fileSize: file.size,
      });

      const { cvId } = await parseUploadedPdfToCv({ uploadId });

      toast.success(t("home.uploadAndParseSuccess"));
      router.push(`/cv/${cvId}`);
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : t("home.uploadError");

      toast.error(t("home.uploadError"), {
        description,
      });
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  }

  function pickSinglePdf(files: FileList | File[]): File | null {
    const asArray = Array.from(files);
    if (asArray.length === 0) return null;

    if (asArray.length > 1) {
      toast.error(t("home.uploadError"), {
        description: t("home.onlyOneFileAllowedError"),
      });
      return null;
    }

    const [file] = asArray;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      toast.error(t("home.uploadError"), {
        description: t("home.invalidFileType"),
      });
      return null;
    }

    if (selectedFile) {
      toast.error(t("home.uploadError"), {
        description: t("home.fileAlreadySelectedError"),
      });
      return null;
    }

    return file;
  }

  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.42),transparent_48%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_42%)]" />

      <div className="relative mx-auto flex w-full max-w-[900px] flex-1 items-center justify-center p-6 md:p-10">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (isUploading) return;
            const file = pickSinglePdf(event.dataTransfer.files);
            if (!file) return;
            setSelectedFile(file);
            setIsDragging(false);
          }}
          className={cn(
            "w-full max-w-[760px] rounded-3xl border border-dashed bg-surface/90 p-8 text-center shadow-sm transition-all md:p-12",
            isDragging
              ? "border-primary bg-secondary/40"
              : "border-border hover:border-primary/40"
          )}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            {isUploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileUp className="h-7 w-7" />}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {selectedFile ? t("home.fileLoadedTitle") : t("home.uploadHomeTitle")}
          </h1>

          <p className="mx-auto mt-3 max-w-[620px] text-sm leading-7 text-muted-foreground md:text-base">
            {selectedFile ? selectedFile.name : t("home.uploadHomeSubtitle")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {selectedFile ? (
              <>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="min-w-[180px] rounded-full"
                >
                  {t("home.removeSelectedFileButton")}
                </Button>

                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    if (!selectedFile) {
                      toast.error(t("home.uploadError"), {
                        description: t("home.noFileSelectedError"),
                      });
                      return;
                    }
                    void uploadFile(selectedFile);
                  }}
                  disabled={isUploading}
                  className="min-w-[180px] rounded-full"
                >
                  {isUploading ? (
                    t("home.uploading")
                  ) : (
                    <>
                      <FileUp className="mr-2 h-5 w-5 inline-block" />
                      {t("home.uploadSelectedButton")}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => inputRef.current?.click()}
                  disabled={isUploading}
                  className="min-w-[180px] rounded-full"
                >
                  {t("home.selectPdfButton")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("home.dropFileHint")}</p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files
                ? pickSinglePdf(event.target.files)
                : null;
              if (!file) return;
              setSelectedFile(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </section>
  );
}
