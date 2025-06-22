"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Brain, Users, Zap, Target } from "lucide-react"
import Link from "next/link"

const values = [
  {
    icon: <Brain className="size-8" />,
    title: "AI-Powered Innovation",
    description:
      "We leverage cutting-edge artificial intelligence to make writing more accessible and effective for everyone."
  },
  {
    icon: <Users className="size-8" />,
    title: "User-Centric Design",
    description:
      "Every feature we build is designed with our users in mind, ensuring an intuitive and delightful experience."
  },
  {
    icon: <Zap className="size-8" />,
    title: "Continuous Improvement",
    description:
      "We're constantly evolving our platform based on user feedback and the latest advancements in AI technology."
  },
  {
    icon: <Target className="size-8" />,
    title: "Quality First",
    description:
      "We're committed to delivering the highest quality writing assistance tools that truly make a difference."
  }
]

export default function AboutPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen pt-16">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="mb-6 text-4xl font-bold md:text-6xl">
              About
              <span className="from-primary to-primary/80 bg-gradient-to-r bg-clip-text text-transparent">
                {" "}
                WordWise
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
              We're on a mission to empower writers everywhere with intelligent
              tools that enhance creativity, improve clarity, and save time.
            </p>
          </div>

          {/* Mission Section */}
          <div className="mx-auto mb-16 max-w-4xl">
            <Card className="p-8">
              <div className="text-center">
                <h2 className="mb-6 text-3xl font-bold">Our Mission</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  WordWise was born from the belief that great writing shouldn't
                  be limited by technical barriers or time constraints. We
                  combine the power of artificial intelligence with intuitive
                  design to create tools that amplify human creativity and help
                  writers of all levels produce their best work.
                </p>
              </div>
            </Card>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="mb-12 text-center text-3xl font-bold">Our Values</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {values.map((value, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="text-primary mb-4">{value.icon}</div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Story Section */}
          <div className="mx-auto mb-16 max-w-4xl">
            <h2 className="mb-8 text-center text-3xl font-bold">Our Story</h2>
            <div className="prose prose-lg text-muted-foreground mx-auto">
              <p className="mb-6">
                WordWise started as a simple idea: what if we could make
                professional-quality writing assistance available to everyone,
                not just those with access to expensive tools or extensive
                training?
              </p>
              <p className="mb-6">
                Our team of engineers, linguists, and designers came together to
                build something different—a platform that doesn't just check
                your grammar, but actually helps you think through your ideas,
                find the right tone, and present your thoughts with clarity and
                impact.
              </p>
              <p>
                Today, WordWise serves thousands of writers, students,
                professionals, and teams around the world, helping them
                communicate more effectively and achieve their goals through
                better writing.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="mb-6 text-3xl font-bold">Ready to Write Better?</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
              Join our community of writers and discover how WordWise can
              transform your writing process.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" variant="gradient">
                  Get Started Today
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
