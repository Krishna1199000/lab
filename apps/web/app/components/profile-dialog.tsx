"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog"
import { Button } from "../../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { User, Mail, Shield, Building2, MapPin, Github, Twitter, Linkedin, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Session } from "next-auth"
import { toast } from "sonner"

interface Profile {
  bio: string | null
  role: string | null
  company: string | null
  location: string | null
  github: string | null
  twitter: string | null
  linkedin: string | null
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
}

interface ProfileDialogProps {
  session: Session | null
}

export function ProfileDialog({ session }: ProfileDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchProfile()
    }
  }, [isOpen, session?.user?.id])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/aips/profile")
      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error("Failed to fetch profile")
        }
        return
      }
      const data = await response.json()
      setProfile(data)
    } catch (error) {
      toast.error("Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  if (!session?.user) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-none shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold">
                  {session.user.name || "User"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>{session.user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="capitalize">{session.user.role || "User"}</span>
                </div>
                {profile && (
                  <>
                    {profile.company && (
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span>{profile.company}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.bio && (
                      <p className="text-muted-foreground mt-4">{profile.bio}</p>
                    )}
                    <div className="flex gap-4 mt-6">
                      {profile.github && (
                        <a
                          href={profile.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                      {profile.twitter && (
                        <a
                          href={profile.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {profile.linkedin && (
                        <a
                          href={profile.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}