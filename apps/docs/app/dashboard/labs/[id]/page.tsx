'use client'

import { notFound } from "next/navigation"
import { Clock, ChevronRight, PlayCircle, CheckCircle, BarChart } from "lucide-react"
import { Button } from "../../../../../web/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../web/ui/Tabs"
import { Badge } from "../../../../../web/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../../../web/ui/Accordion"
import type { Lab } from "../../../../../docs/app/types/lab"

async function getLab(id: string): Promise<Lab | null> {
  try {
    const response = await fetch(`http://localhost:3000/aips/labs/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error("Error fetching lab:", error)
    return null
  }
}

export default async function LabPage({ params }: { params: { id: string } }) {
  const lab = await getLab(params.id)

  if (!lab) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <a href="/dashboard/labs" className="text-gray-500 hover:text-gray-900">
              Training Library
            </a>
            <ChevronRight className="h-4 w-4 text-gray-500" />
            <a href="/dashboard/labs" className="text-gray-500 hover:text-gray-900">
              AWS
            </a>
            <ChevronRight className="h-4 w-4 text-gray-500" />
            <a href="/dashboard/labs" className="text-gray-500 hover:text-gray-900">
              Hands-on Labs
            </a>
            <ChevronRight className="h-4 w-4 text-gray-500" />
            <span className="text-gray-900">{lab.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="text-xs font-semibold tracking-[3px] text-emerald-600 mb-4">HANDS-ON LAB</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">{lab.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-900">
                  {lab.difficulty.charAt(0) + lab.difficulty.slice(1).toLowerCase()}
                </span>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Up to {lab.duration}m</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">{lab.objectives.length} Lab steps</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="p-6 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <PlayCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Get guided in a real environment</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Practice with a step-by-step scenario in a real, provisioned environment.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Learn and validate</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Use validations to check your solutions every step of the way.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <BarChart className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">See results</h3>
                    <p className="text-sm text-gray-500 mt-1">Track your knowledge and monitor your progress.</p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="about" className="w-full">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="author">Author</TabsTrigger>
              </TabsList>
              <TabsContent value="about" className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Description</h2>
                  <div className="prose max-w-none">
                    <p>{lab.description}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Learning objectives</h2>
                  <div className="prose max-w-none">
                    <p>Upon completion of this beginner-level lab, you will be able to:</p>
                    <ul>
                      {lab.objectives.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Intended audience</h2>
                  <p className="text-gray-600">{lab.audience}</p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Prerequisites</h2>
                  <div className="prose max-w-none">
                    <p>{lab.prerequisites}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Covered topics</h2>
                  <div className="flex flex-wrap gap-2">
                    {lab.coveredTopics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="author">
                {lab.author.name ? (
                  <div className="flex items-center gap-4">
                    {lab.author.image && (
                      <img
                        src={lab.author.image || "/placeholder.svg"}
                        alt={lab.author.name}
                        className="h-12 w-12 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{lab.author.name}</h3>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No author information available.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Button className="w-full" size="lg">
              Start lab
            </Button>

            <div className="border rounded-lg">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Lab steps</h2>
              </div>
              <div className="p-4">
                <Accordion type="single" collapsible className="space-y-4">
                  {lab.objectives.map((objective, index) => (
                    <AccordionItem key={index} value={`step-${index + 1}`}>
                      <AccordionTrigger className="text-sm hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">
                            {index + 1}
                          </div>
                          <span className="font-medium">{objective}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-9 pt-2">
                          <p className="text-sm text-gray-500">Complete this step to progress through the lab.</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Lab rules apply</h2>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500">This lab follows standard lab rules and guidelines.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

