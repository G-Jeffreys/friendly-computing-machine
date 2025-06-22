"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Edit3, FileText, Lightbulb, MessageSquare, Presentation } from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: <Edit3 className="h-8 w-8" />,
    title: "Smart Writing Assistant",
    description: "AI-powered grammar checking, tone harmonization, and style suggestions to enhance your writing quality."
  },
  {
    icon: <FileText className="h-8 w-8" />,
    title: "Document Management",
    description: "Organize and manage all your documents in one place with powerful search and categorization features."
  },
  {
    icon: <Lightbulb className="h-8 w-8" />,
    title: "Research Assistant",
    description: "Get intelligent research suggestions and citation recommendations powered by advanced AI technology."
  },
  {
    icon: <MessageSquare className="h-8 w-8" />,
    title: "Definition Expander",
    description: "Instantly expand definitions and explanations for complex terms and concepts in your writing."
  },
  {
    icon: <Presentation className="h-8 w-8" />,
    title: "Slide Generation",
    description: "Automatically generate professional slide decks from your documents with AI-powered content organization."
  },
  {
    icon: <CheckCircle className="h-8 w-8" />,
    title: "Citation Hunter",
    description: "Find and format citations automatically with our comprehensive academic database integration."
  }
]

export default function FeaturesPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen pt-16">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Powerful Features for
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {" "}Better Writing
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              WordWise combines cutting-edge AI technology with intuitive design to help you write better, faster, and more effectively.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Writing?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of writers, students, and professionals who are already using WordWise to enhance their writing.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" variant="gradient">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline">
                  Try Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 