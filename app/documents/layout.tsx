"use server"

import Header from "@/components/header"
import DocumentsSidebar from "./_components/documents-sidebar"

export default async function DocumentsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />

      {/* Body: sidebar + main content */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Assuming header ~64px => 4rem */}
        <DocumentsSidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </>
  )
}
