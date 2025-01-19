'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Beaker } from 'lucide-react';
import { Input } from '../../../../web/ui/input';
import { Card } from '../../../../web/ui/card';
import { useRouter } from 'next/navigation';

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

const LabIcon = () => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 40 40"
    width="32"
    height="32"
    className="text-emerald-500"
  >
    <path
      fillRule="evenodd"
      d="M8 0a8 8 0 0 0-8 8v24a8 8 0 0 0 8 8h24a8 8 0 0 0 8-8V8a8 8 0 0 0-8-8H8zm16 17.675 7.231 9.943A4.018 4.018 0 0 1 27.981 34H12.02a4.017 4.017 0 0 1-3.25-6.382L16 17.675V8h-2V6h12v2h-2v9.675zM18 8v10.325L15.327 22h9.346L22 18.325V8h-4zm-5.981 24H27.98a2.02 2.02 0 0 0 1.633-3.206L26.127 24H13.873l-3.487 4.794A2.018 2.018 0 0 0 12.019 32z"
      clipRule="evenodd"
    />
  </svg>
);

export default function LabsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredLab, setHoveredLab] = useState<string | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3000/aips/labs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLabs(data);
    } catch (error) {
      console.error('Error fetching labs:', error);
      setError('Failed to fetch labs. Please try again later.');
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button onClick={fetchLabs} className="text-primary hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Explore all library</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-[400px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Search in our library..."
                className="pl-9 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
              Filters
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLabs.map((lab) => (
            <motion.div
              key={lab.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ y: -4 }}
              onClick={() => router.push(`/labs/${lab.id}`)}
              className="cursor-pointer"
            >
              <Card className="overflow-hidden border border-gray-200 hover:border-emerald-500 transition-colors">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <LabIcon />
                    <span className="text-xs font-semibold tracking-[3px] text-emerald-600">
                      HANDS-ON LAB
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {lab.title}
                    </h2>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {lab.description}
                    </p>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {lab.difficulty.charAt(0) + lab.difficulty.slice(1).toLowerCase()}
                      </span>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Up to {lab.duration}m</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{lab.objectives.length} Lab steps</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}