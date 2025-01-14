"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { LogOut, LayoutDashboard, Plus, Beaker, Pencil, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../ui/card";
import { toast } from "sonner";
import { getRelativeTime } from "../lib/utils/format-time";

interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  published: boolean;
  isOwner: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    name: string | null;
    email: string | null;
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await fetch("/aips/labs");
        if (!response.ok) throw new Error("Failed to fetch labs");
        const data = await response.json();
        setLabs(data);
      } catch (error) {
        toast.error("Failed to load labs");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchLabs();
    }
  }, [session?.user?.id]);

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can delete labs");
      return;
    }

    const lab = labs.find(l => l.id === id);
    if (!lab?.isOwner) {
      toast.error("You can only delete your own labs");
      return;
    }

    if (!confirm("Are you sure you want to delete this lab?")) return;

    try {
      const response = await fetch(`/aips/labs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete lab");
      }

      setLabs(labs.filter(lab => lab.id !== id));
      toast.success("Lab deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lab");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Separate labs into owned and other labs
  const ownedLabs = labs.filter(lab => lab.isOwner);
  const otherLabs = labs.filter(lab => !lab.isOwner);

  const renderTimeInfo = (lab: Lab) => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Created {getRelativeTime(lab.createdAt)}</span>
      {lab.updatedAt !== lab.createdAt && (
        <span className="italic">(edited {getRelativeTime(lab.updatedAt)})</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="ml-2 text-xl font-semibold">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                Welcome, {session.user?.name || session.user?.email}
                {isAdmin && <span className="ml-2 text-primary">(Admin)</span>}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/auth" })}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isAdmin && (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Your Labs</h2>
                <Button
                  onClick={() => router.push('/dashboard/create-lab')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Lab
                </Button>
              </div>

              {ownedLabs.length === 0 ? (
                <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 mb-8">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Beaker className="h-12 w-12 text-primary/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Labs Created Yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first lab to get started</p>
                    <Button
                      onClick={() => router.push('/dashboard/create-lab')}
                      className="group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Lab
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {ownedLabs.map((lab) => (
                    <Card key={lab.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex justify-between items-start">
                          <span className="text-xl font-semibold">{lab.title}</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/dashboard/edit-lab/${lab.id}`)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(lab.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-1 rounded-full bg-primary/10 text-xs">
                              {lab.difficulty}
                            </span>
                            <span className="text-sm">{lab.duration} minutes</span>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-2">{lab.description}</p>
                      </CardContent>
                      <CardFooter>
                        {renderTimeInfo(lab)}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">All Labs</h2>
            {labs.length === 0 ? (
              <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Beaker className="h-12 w-12 text-primary/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Labs Available</h3>
                  <p className="text-muted-foreground">No labs have been created yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {labs.map((lab) => (
                  <Card key={lab.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">{lab.title}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-xs">
                            {lab.difficulty}
                          </span>
                          <span className="text-sm">{lab.duration} minutes</span>
                        </div>
                        <div className="mt-2 text-sm">
                          by {lab.author.name || lab.author.email}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-2">{lab.description}</p>
                    </CardContent>
                    <CardFooter>
                      {renderTimeInfo(lab)}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

