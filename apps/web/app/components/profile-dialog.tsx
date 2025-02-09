"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog"
import { Button } from "../../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { User, Mail, Shield, Building2, MapPin, Github, Twitter, Linkedin, Loader2, Camera } from "lucide-react"
import { motion } from "framer-motion"
import type { Session } from "next-auth"
import { toast } from "sonner"
import Image from "next/image"

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
    setIsLoading(true);
    try {
      const response = await fetch("/aips/profile");
      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error("Failed to fetch profile");
        }
        return;
      }
      const data = await response.json();
      
      // Log the profile data to see what image URL we're getting
      console.log('Profile data:', {
        userImage: data.user?.image,
        profileImage: data.image
      });
      
      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };
  

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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="border-none shadow-none">
              <CardHeader className="pb-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {session.user.image ? (
                      <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-background">
                

                        <Image
                          src={session.user.image || "/placeholder.svg"}
                          alt={session.user.name || "Profile"}
                          fill
                          className="object-cover"
                          sizes="96px"
                          onError={(e) => {
                            // Log the failed image URL
                            console.error('Image failed to load:', {
                              src: e.currentTarget.src,
                              error: e
                            });

                            // Set fallback image
                            e.currentTarget.src = "/placeholder.svg";

                            // Show toast notification
                            toast.error("Failed to load profile image");
                          }}
                          onLoad={(e) => {
                            // Log successful loads to help debug
                            console.log('Image loaded successfully:', e.currentTarget.src);
                          }}
                        />


                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-4 border-background">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-bold text-center">{session.user.name || "User"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-sm">{session.user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm capitalize">{session.user.role || "User"}</span>
                </div>
                {profile && (
                  <>
                    {profile.company && (
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="text-sm">{profile.company}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="text-sm">{profile.location}</span>
                      </div>
                    )}
                    {profile.bio && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium">About</h4>
                        <p className="text-sm text-muted-foreground">{profile.bio}</p>
                      </div>
                    )}
                    <div className="flex gap-4 mt-6 justify-center">
                      {profile.github && (
                        <a
                          href={profile.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Github className="h-5 w-5" />
                          <span className="sr-only">GitHub Profile</span>
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
                          <span className="sr-only">Twitter Profile</span>
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
                          <span className="sr-only">LinkedIn Profile</span>
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

