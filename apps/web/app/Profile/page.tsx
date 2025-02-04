"use client"
import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Upload, Camera } from "lucide-react"

function Profile() {
  const [profile, setProfile] = useState({
    bio: "",
    twitter: "",
    linkedin: "",
    github: "",
    company: "",
    location: "",
    image: null as File | null,
    imagePreview: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("Selected image:", file.name, "Size:", file.size, "Type:", file.type)

      // Check file size (e.g., limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds the limit of 5MB")
        return
      }

      setProfile((prev) => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      console.log("Starting profile submission")
      const formData = new FormData()

      Object.entries(profile).forEach(([key, value]) => {
        if (value) {
          console.log("Adding to FormData:", key, value instanceof File ? "File" : value)
          formData.append(key, value)
        }
      })

      console.log("Sending request to /aips/profile")
      const response = await fetch("/aips/profile", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to update profile")
      }

      // Redirect to dashboard on success
      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="relative w-32 h-32 mx-auto">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-gray-200">
            {profile.imagePreview ? (
              <img
                src={profile.imagePreview || "/placeholder.svg"}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <label
            htmlFor="image-upload"
            className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        <div className="space-y-4">
          <textarea
            placeholder="Tell us about yourself..."
            value={profile.bio}
            onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Twitter className="w-5 h-5 text-blue-400" />
              <input
                type="text"
                placeholder="Twitter username"
                value={profile.twitter}
                onChange={(e) => setProfile((prev) => ({ ...prev, twitter: e.target.value }))}
                className="flex-1 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Linkedin className="w-5 h-5 text-blue-700" />
              <input
                type="text"
                placeholder="LinkedIn username"
                value={profile.linkedin}
                onChange={(e) => setProfile((prev) => ({ ...prev, linkedin: e.target.value }))}
                className="flex-1 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Github className="w-5 h-5" />
              <input
                type="text"
                placeholder="GitHub username"
                value={profile.github}
                onChange={(e) => setProfile((prev) => ({ ...prev, github: e.target.value }))}
                className="flex-1 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <input
                type="text"
                placeholder="Company"
                value={profile.company}
                onChange={(e) => setProfile((prev) => ({ ...prev, company: e.target.value }))}
                className="flex-1 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg md:col-span-2">
              <input
                type="text"
                placeholder="Location"
                value={profile.location}
                onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))}
                className="flex-1 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Updating..." : "Update Profile"}
        </button>
      </motion.form>
    </div>
  )
}

export default Profile