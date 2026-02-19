"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { H2, Muted } from "@/components/ui/typography";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "cv-io-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function formatCvDateLabel(createdAt: number): string {
  const date = new Date(createdAt);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `CV ${day} ${month} - ${year}`;
}

export function Sidebar() {
  const { t } = useTranslation();
  const cvs = useQuery(api.cvs.listAll);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : getSystemTheme();
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <aside className="flex w-full max-w-[250px] shrink-0 flex-col border-r border-border bg-surface-elevated p-4 md:p-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          CV
        </div>
        <div>
          <p className="font-semibold text-foreground">cv.io</p>
          <Muted className="text-xs">{t("sidebar.brandTagline")}</Muted>
        </div>
      </div>

      <div className="mb-4 h-px bg-border" />

      <div className="mb-3">
        <H2 className="text-lg">{t("sidebar.cvsTitle")}</H2>
      </div>

      {cvs === undefined ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-4">
          <Muted className="text-sm">{t("sidebar.loadingState")}</Muted>
        </div>
      ) : cvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-4">
          <Muted className="text-sm">{t("sidebar.emptyState")}</Muted>
        </div>
      ) : (
        <div className="space-y-2">
          {cvs.map((cv) => (
            <button
              key={cv._id}
              type="button"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              {formatCvDateLabel(cv.createdAt)}
            </button>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-auto mb-3 w-full justify-center rounded-lg"
      >
        Buy me a coffee
      </Button>

      <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-surface p-3">
        <Sun
          className={`h-4 w-4 transition-colors ${
            theme === "light" ? "text-amber-500" : "text-muted-foreground"
          }`}
        />
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label={t("sidebar.themeSwitchAria")}
        />
        <Moon
          className={`h-4 w-4 transition-colors ${
            theme === "dark" ? "text-sky-300" : "text-muted-foreground"
          }`}
        />
      </div>
    </aside>
  );
}
