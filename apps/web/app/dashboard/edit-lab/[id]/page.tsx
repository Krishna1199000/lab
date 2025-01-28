"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "../../../../ui/button"
import { Input } from "../../../../ui/input"
import { Textarea } from "../../../../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../ui/card"
import { Label } from "../../../../ui/label"
import { ArrowLeft, Save, ImageIcon } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

export default function EditLab({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState("BEGINNER")

  const [formData, setFormData] = useState({
    title: "",
    difficulty: "BEGINNER",
    duration: "",
    description: "",
    audience: "",
    prerequisites: "",
    objectives: "",
    coveredTopics: "",
    environment: "",
    steps: "",
  })

  useEffect(() => {
    const fetchLab = async () => {
      try {
        const response = await fetch(`/api/labs/${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch lab")
        const lab = await response.json()

        setFormData({
          title: lab.title,
          difficulty: lab.difficulty,
          duration: lab.duration.toString(),
          description: lab.description,
          audience: lab.audience,
          prerequisites: lab.prerequisites,
          objectives: lab.objectives.join("\n"),
          coveredTopics: lab.coveredTopics.join("\n"),
          environment: lab.environment.images?.join("\n") || "",
          steps: lab.steps.setup?.join("\n") || "",
        })

        setDifficulty(lab.difficulty)
        if (lab.environment.images?.[0]) {
          setImagePreview(lab.environment.images[0])
        }
      } catch (error) {
        toast.error("Failed to load lab")
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchLab()
    }
  }, [params.id, session?.user?.id, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast.error("Only JPEG, PNG and GIF files are allowed")
        return
      }
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDifficultyChange = (value: string) => {
    setDifficulty(value)
    setFormData((prev) => ({
      ...prev,
      difficulty: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.set(key, value)
      })

      // Add the file if selected
      if (selectedFile) {
        formDataObj.set("environmentImage", selectedFile)
      }

      // Process arrays
      const objectives = formData.objectives.split("\n").filter(Boolean)
      const coveredTopics = formData.coveredTopics.split("\n").filter(Boolean)
      const environmentUrls = formData.environment.split("\n").filter(Boolean)
      const steps = formData.steps.split("\n").filter(Boolean)

      formDataObj.set("objectives", JSON.stringify(objectives))
      formDataObj.set("coveredTopics", JSON.stringify(coveredTopics))
      formDataObj.set("environment", JSON.stringify({ images: environmentUrls }))
      formDataObj.set("steps", JSON.stringify({ setup: steps }))

      const response = await fetch(`/aips/labs/${params.id}`, {
        method: "PUT",
        body: formDataObj,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update lab")
      }

      toast.success("Lab updated successfully!")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error.message || "Failed to update lab")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div {...fadeIn}>
          <Button variant="ghost" onClick={() => router.back()} className="mb-6 hover:bg-secondary/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </motion.div>

        <motion.div {...fadeIn}>
          <Card className="backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Edit Lab</CardTitle>
              <CardDescription>Update your lab details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="transition-all duration-200 focus:ring-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select name="difficulty" value={difficulty} onValueChange={handleDifficultyChange}>
                        <SelectTrigger id="difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEGINNER">Beginner</SelectItem>
                          <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                          <SelectItem value="ADVANCED">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        type="number"
                        id="duration"
                        name="duration"
                        required
                        min="1"
                        value={formData.duration}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      required
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objectives">Objectives (one per line)</Label>
                    <Textarea
                      id="objectives"
                      name="objectives"
                      required
                      value={formData.objectives}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience</Label>
                    <Textarea
                      id="audience"
                      name="audience"
                      required
                      value={formData.audience}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prerequisites">Prerequisites</Label>
                    <Textarea
                      id="prerequisites"
                      name="prerequisites"
                      required
                      value={formData.prerequisites}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Environment Image</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <input
                          type="file"
                          id="environmentImage"
                          name="environmentImage"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="environmentImage"
                          className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          {imagePreview ? (
                            <div className="relative w-full aspect-video">
                              <img
                                src={imagePreview || "/placeholder.svg"}
                                alt="Preview"
                                className="rounded-lg object-cover w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                              <p className="text-sm text-muted-foreground mt-2">Click to upload image (max 5MB)</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="environment">Additional Environment URLs (one per line)</Label>
                    <Textarea
                      id="environment"
                      name="environment"
                      placeholder="Enter additional image URLs, one per line"
                      value={formData.environment}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coveredTopics">Covered Topics (one per line)</Label>
                    <Textarea
                      id="coveredTopics"
                      name="coveredTopics"
                      required
                      value={formData.coveredTopics}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="steps">Steps (one per line)</Label>
                    <Textarea
                      id="steps"
                      name="steps"
                      required
                      className="min-h-[200px]"
                      value={formData.steps}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          className="h-4 w-4 border-2 border-white rounded-full border-t-transparent"
                        />
                        Updating Lab...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save Changes
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

