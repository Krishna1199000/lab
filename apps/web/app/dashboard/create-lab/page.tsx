"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Textarea } from "../../../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card"
import { Label } from "../../../ui/label"
import { ArrowLeft, Upload, ImageIcon } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function CreateLab() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState("BEGINNER")
  const totalSections = 4

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

  const validateCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return formData.title.trim() !== "" && formData.duration.trim() !== "" && formData.description.trim() !== ""
      case 1:
        return formData.audience.trim() !== "" && formData.prerequisites.trim() !== ""
      case 2:
        return formData.coveredTopics.trim() !== ""
      case 3:
        return formData.steps.trim() !== ""
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateCurrentSection()) {
      setCurrentSection(Math.min(totalSections - 1, currentSection + 1))
    } else {
      toast.error("Please fill in all required fields before proceeding")
    }
  }

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

    const requiredFields = {
      title: formData.title.trim(),
      duration: formData.duration.trim(),
      description: formData.description.trim(),
      audience: formData.audience.trim(),
      prerequisites: formData.prerequisites.trim(),
    }

    const emptyFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (emptyFields.length > 0) {
      toast.error(`Please fill in all required fields: ${emptyFields.join(", ")}`)
      return
    }

    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()

      formDataObj.set("title", formData.title)
      formDataObj.set("duration", formData.duration)
      formDataObj.set("description", formData.description)
      formDataObj.set("audience", formData.audience)
      formDataObj.set("prerequisites", formData.prerequisites)
      formDataObj.set("difficulty", difficulty)
      formDataObj.set("authorId", session?.user?.id || "")

      if (selectedFile) {
        formDataObj.set("environmentImage", selectedFile)
      }

      const objectives = formData.objectives.split("\n").filter(Boolean)
      const coveredTopics = formData.coveredTopics.split("\n").filter(Boolean)
      const environmentUrls = formData.environment.split("\n").filter(Boolean)
      const steps = formData.steps.split("\n").filter(Boolean)

      formDataObj.set("objectives", JSON.stringify(objectives))
      formDataObj.set("coveredTopics", JSON.stringify(coveredTopics))
      formDataObj.set("environment", JSON.stringify({ images: environmentUrls }))
      formDataObj.set("steps", JSON.stringify({ setup: steps }))

      const response = await fetch("/aips/labs", {
        method: "POST",
        body: formDataObj,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create lab")
      }

      toast.success("Lab created successfully!")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Detailed error:", error)
      toast.error(error.message || "Failed to create lab. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFormSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <motion.div {...fadeIn} className="space-y-6">
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
          </motion.div>
        )
      case 1:
        return (
          <motion.div {...fadeIn} className="space-y-6">
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
              <Textarea id="audience" name="audience" required value={formData.audience} onChange={handleInputChange} />
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
          </motion.div>
        )
      case 2:
        return (
          <motion.div {...fadeIn} className="space-y-6">
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
          </motion.div>
        )
      case 3:
        return (
          <motion.div {...fadeIn} className="space-y-6">
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
          </motion.div>
        )
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={stagger}
      className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6"
    >
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
              <CardTitle className="text-2xl font-bold">Create New Lab</CardTitle>
              <CardDescription>
                Step {currentSection + 1} of {totalSections}
              </CardDescription>
              <div className="w-full bg-secondary/30 h-2 rounded-full mt-4">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {renderFormSection()}

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                    disabled={currentSection === 0}
                  >
                    Previous
                  </Button>

                  {currentSection === totalSections - 1 ? (
                    <Button type="submit" disabled={isSubmitting || !validateCurrentSection()}>
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="h-4 w-4 border-2 border-white rounded-full border-t-transparent"
                          />
                          Creating Lab...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Create Lab
                        </div>
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleNext}>
                      Next
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

