/*
<ai_context>
This client component provides the header for the app.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs"
import { Menu, Rocket, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ThemeSwitcher } from "./utilities/theme-switcher"
import { cn } from "@/lib/utils"

const navLinks: { href: string; label: string }[] = []

const signedInLinks = [
  { href: "/documents", label: "Documents" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/slides", label: "Slides" }
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 z-50 w-full border-b backdrop-blur",
        isScrolled && "shadow-sm"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <SignedIn>
            <Link
              href="/documents"
              className="flex items-center space-x-2 transition-opacity hover:opacity-90"
            >
              <Rocket className="size-6" />
              <span className="from-primary to-primary/80 bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent">
                WordWise
              </span>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link
              href="/about"
              className="flex items-center space-x-2 transition-opacity hover:opacity-90"
            >
              <Rocket className="size-6" />
              <span className="from-primary to-primary/80 bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent">
                WordWise
              </span>
            </Link>
          </SignedOut>

          {/* Navigation - showing appropriate links based on auth state */}
          <nav className="hidden gap-6 md:flex">
            <SignedOut>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </SignedOut>

            <SignedIn>
              {signedInLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </SignedIn>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeSwitcher />

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" className="text-sm font-medium">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="gradient" className="text-sm font-medium">
                Get Started
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/about" />
          </SignedIn>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <nav className="bg-background/95 border-t p-4 backdrop-blur md:hidden">
          <ul className="space-y-2">
            <SignedOut>
              {navLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground block rounded-md px-3 py-2 text-sm font-medium transition-colors"
                    onClick={toggleMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </SignedOut>
            <SignedIn>
              {signedInLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground block rounded-md px-3 py-2 text-sm font-medium transition-colors"
                    onClick={toggleMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </SignedIn>
          </ul>
        </nav>
      )}
    </header>
  )
}
