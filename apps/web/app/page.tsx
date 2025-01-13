"use client";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { BeakerIcon, BrainCircuit, Code2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-8"
          >
            <BeakerIcon className="w-full h-full text-cyan-400" />
          </motion.div>
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
            Hands-on Lab Admin
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Create, manage, and monitor interactive learning experiences. Your gateway
            to hands-on education.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-cyan-500 hover:bg-cyan-600"
              onClick={() => router.push('/api/auth/signin')}
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/auth')}
            >
              Sign In
            </Button>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
        >
          <motion.div variants={item}>
            <Card className="p-6 bg-gray-800/50 border-gray-700 hover:border-cyan-500 transition-colors">
              <BeakerIcon className="w-12 h-12 text-cyan-400 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Interactive Labs</h2>
              <p className="text-gray-400">
                Create engaging hands-on laboratories with step-by-step guidance and real-time monitoring.
              </p>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="p-6 bg-gray-800/50 border-gray-700 hover:border-cyan-500 transition-colors">
              <BrainCircuit className="w-12 h-12 text-cyan-400 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Learning Paths</h2>
              <p className="text-gray-400">
                Design structured learning journeys with progressive difficulty levels and clear objectives.
              </p>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="p-6 bg-gray-800/50 border-gray-700 hover:border-cyan-500 transition-colors">
              <Code2 className="w-12 h-12 text-cyan-400 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Code Environments</h2>
              <p className="text-gray-400">
                Set up pre-configured development environments for seamless learning experiences.
              </p>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}