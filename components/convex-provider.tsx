"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type ConvexProviderProps = {
  children: ReactNode;
};

export function AppConvexProvider({ children }: ConvexProviderProps) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
