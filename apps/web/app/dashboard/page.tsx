"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "../../ui/button";
import { LogOut, LayoutDashboard, Plus, Beaker } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

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
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-lg p-8 shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">
                Welcome to Your Dashboard
              </h2>
              <p className="text-muted-foreground text-lg">
                Create and manage your labs in one place
              </p>
            </div>
            
            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/dashboard/create-lab')}
                size="lg"
                className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
              >
                <div className="relative z-10 flex items-center gap-2">
                  <Beaker className="w-6 h-6" />
                  <span>Create New Lab</span>
                  <Plus className="w-5 h-5" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/5 to-primary-foreground/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

