"use server"

import Header from "@/components/header"
import DemoSidebar from "./_components/demo-sidebar"

export default async function DemoLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <DemoSidebar />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </>
  )
}
