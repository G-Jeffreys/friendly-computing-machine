/*
<ai_context>
This client component provides the providers for the app.
</ai_context>
*/

"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
import dynamic from "next/dynamic"

const CSPostHogProvider = dynamic(
  () => import("./posthog/posthog-provider").then(m => m.CSPostHogProvider),
  {
    ssr: false,
    loading: () => null
  }
)

export const Providers = ({ children, ...props }: ThemeProviderProps) => {
  return (
    <NextThemesProvider {...props}>
      <TooltipProvider>
        <CSPostHogProvider>{children}</CSPostHogProvider>
      </TooltipProvider>
    </NextThemesProvider>
  )
}
