"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type LanguageOption = {
  code: "en" | "es";
  label: "EN" | "ES";
  flag: string;
};

const languageOptions: LanguageOption[] = [
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "es", label: "ES", flag: "🇪🇸" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage === "es" ? "es" : "en";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-auto h-8 min-w-14 rounded-full bg-surface/95 px-2.5 text-xs font-semibold shadow-md backdrop-blur-sm"
            aria-label={t("language.switchAria")}
          >
            {currentLanguage.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          {languageOptions.map((option) => (
            <DropdownMenuItem
              key={option.code}
              onClick={() => {
                void i18n.changeLanguage(option.code);
              }}
              className="cursor-pointer justify-between"
            >
              <span>
                {option.label} {option.flag}
              </span>
              {currentLanguage === option.code ? (
                <Check className="h-4 w-4 text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
