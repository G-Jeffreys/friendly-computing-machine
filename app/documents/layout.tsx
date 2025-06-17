"use server"

import Header from "@/components/header"

export default async function DocumentsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />

      {children}
    </>
  )
}
