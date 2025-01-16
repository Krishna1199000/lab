'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, BookOpen, BarChart } from 'lucide-react';
import { Input } from '../../../../web/ui/input';
import { Badge } from '../../../../web/ui/badge';
import { Card } from '../../../../web/ui/card';
import { Button } from '../../../../web/ui/button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface Lab {
  id: string;
  title: string;
  difficulty: Difficulty;
  duration: number;
  description: string;
  objectives: string[];
  audience: string;
  prerequisites: string;
  coveredTopics: string[];
  published: boolean;
  author: {
    name: string | null;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

const difficultyColors = {
  BEGINNER: 'bg-green-100 text-green-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-red-100 text-red-800'
};

export default function LabsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredLab, setHoveredLab] = useState<string | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aips/labs/[id]`);
      if (!response.ok) throw new Error('Failed to fetch labs');
      const data = await response.json();
      setLabs(data);
    } catch (error) {
      console.error('Error fetching labs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter(lab =>
    lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lab.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/10 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-primary">Explore Labs</h1>
          <p className="text-muted-foreground max-w-2xl">
            Discover hands-on labs to enhance your skills. Each lab is carefully crafted to provide real-world experience.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="search"
            placeholder="Search labs..."
            className="pl-10 bg-background/50 backdrop-blur-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredLabs.map((lab) => (
              <motion.div
                key={lab.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                onHoverStart={() => setHoveredLab(lab.id)}
                onHoverEnd={() => setHoveredLab(null)}
              >
                <Card className="relative h-full overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className={difficultyColors[lab.difficulty]}>
                        {lab.difficulty.toLowerCase()}
                      </Badge>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{lab.duration} min</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold leading-tight text-primary">{lab.title}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">{lab.description}</p>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{lab.objectives.length} objectives</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart className="h-4 w-4" />
                        <span>{lab.coveredTopics.length} topics</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {lab.author.image && (
                          <img
                            src={lab.author.image}
                            alt={lab.author.name || 'Author'}
                            className="h-6 w-6 rounded-full"
                          />
                        )}
                        <span className="text-sm text-muted-foreground">{lab.author.name || 'Anonymous'}</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/labs/${lab.id}`)}
                      >
                        Start Lab
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {hoveredLab === lab.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 bg-primary/90 p-6 flex flex-col justify-between text-primary-foreground backdrop-blur-sm"
                      >
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">What you'll learn</h3>
                          <ul className="space-y-2 text-sm">
                            {lab.objectives.map((objective, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-primary-foreground" />
                                <span>{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-1">Prerequisites</h4>
                            <p className="text-sm opacity-90">{lab.prerequisites}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">Target Audience</h4>
                            <p className="text-sm opacity-90">{lab.audience}</p>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => router.push(`/labs/${lab.id}`)}
                          >
                            Start Lab
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}