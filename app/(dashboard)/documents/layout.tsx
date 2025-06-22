"use server"

import { Header } from "@/components/header"
import DocumentsSidebar from "@/components/layout/docs-sidebar"

export default async function DocumentsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />

      {/* Body: sidebar + main content with top padding for fixed header */}
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        {/* Header is 64px (4rem) tall, so we add pt-16 for proper spacing */}
        <DocumentsSidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </>
  )
}
