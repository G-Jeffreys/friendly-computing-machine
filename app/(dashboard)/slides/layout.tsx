import { AppShell } from "@/components/layout/app-shell"

export default function SlidesLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
} 