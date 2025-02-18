"use client"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Editor } from '@tinymce/tinymce-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card"
import { Label } from "../../../ui/label"
import { Textarea } from "../../../ui/textarea"
import { ArrowLeft, Upload, ImageIcon } from 'lucide-react'
import { motion } from "framer-motion"
import { toast } from "sonner"
import Image from "next/image"

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
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [selectedBeforeFile, setSelectedBeforeFile] = useState<File | null>(null)
  const [selectedAfterFile, setSelectedAfterFile] = useState<File | null>(null)
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null)
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState("BEGINNER")
  const totalSections = 3

  const [formData, setFormData] = useState({
    title: "",
    difficulty: "BEGINNER",
    duration: "",
    content: "",
    coveredTopics: "",
    environment: "",
    steps: "",
  })

  const validateCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return formData.title.trim() !== "" && formData.duration.trim() !== "" && formData.content.trim() !== ""
      case 1:
        return formData.coveredTopics.trim() !== ""
      case 2:
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

  const handleEditorChange = (content: string) => {
    setFormData((prev) => ({
      ...prev,
      content,
    }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
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

      if (type === 'before') {
        setSelectedBeforeFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setBeforeImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setSelectedAfterFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setAfterImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
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
      content: formData.content.trim(),
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
      formDataObj.set("content", formData.content)
      formDataObj.set("difficulty", difficulty)
      formDataObj.set("authorId", (session?.user as { id: string }).id || "")

      if (selectedBeforeFile) {
        formDataObj.set("environmentImageBefore", selectedBeforeFile)
      }

      if (selectedAfterFile) {
        formDataObj.set("environmentImageAfter", selectedAfterFile)
      }

      const coveredTopics = formData.coveredTopics.split("\n").filter(Boolean)
      const environmentUrls = formData.environment.split("\n").filter(Boolean)
      const steps = formData.steps.split("\n").filter(Boolean)

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Detailed error:', error.message)
        console.error('Error stack:', error.stack)
        toast.error(error.message || "Failed to create lab. Please try again.")
      } else {
        console.error('An unknown error occurred:', error)
        toast.error("An unexpected error occurred.")
      }
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
              <Label htmlFor="content">Content</Label>
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                init={{
                  height: 500,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                }}
                value={formData.content}
                onEditorChange={handleEditorChange}
              />
            </div>
          </motion.div>
        )
      case 1:
        return (
          <motion.div {...fadeIn} className="space-y-6">
            <div className="space-y-4">
              <Label>Environment Images</Label>
              <div className="grid grid-cols-2 gap-4">
                {/* Before Image Upload */}
                <div className="space-y-2">
                  <Label>Before Image</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      id="environmentImageBefore"
                      name="environmentImageBefore"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => handleFileChange(e, 'before')}
                      className="hidden"
                    />
                    <label
                      htmlFor="environmentImageBefore"
                      className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                    >
                      {beforeImagePreview ? (
                        <div className="relative w-full aspect-video">
                          <Image
                            src={beforeImagePreview}
                            alt="Before Preview"
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground mt-2">Upload Before Image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* After Image Upload */}
                <div className="space-y-2">
                  <Label>After Image</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      id="environmentImageAfter"
                      name="environmentImageAfter"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => handleFileChange(e, 'after')}
                      className="hidden"
                    />
                    <label
                      htmlFor="environmentImageAfter"
                      className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                    >
                      {afterImagePreview ? (
                        <div className="relative w-full aspect-video">
                          <Image
                            src={afterImagePreview}
                            alt="After Preview"
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground mt-2">Upload After Image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
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
      case 2:
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