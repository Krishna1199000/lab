"use client"
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin, Upload, Camera } from 'lucide-react';

function App() {
  const [profile, setProfile] = useState({
    bio: '',
    twitter: '',
    linkedin: '',
    github: '',
    company: '',
    location: '',
    image: null as File | null,
    imagePreview: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfile(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      const response = await fetch('/aips/profile', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update profile');

      // Redirect to dashboard on success
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-purple-600 to-blue-600">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 bg-gray-700">
                  {profile.imagePreview ? (
                    <img 
                      src={profile.imagePreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} className="pt-24 px-8 pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Github className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profile.github}
                    onChange={e => setProfile(prev => ({ ...prev, github: e.target.value }))}
                    className="block w-full pl-10 rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="GitHub Profile"
                  />
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Twitter className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profile.twitter}
                    onChange={e => setProfile(prev => ({ ...prev, twitter: e.target.value }))}
                    className="block w-full pl-10 rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Twitter Profile"
                  />
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Linkedin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profile.linkedin}
                    onChange={e => setProfile(prev => ({ ...prev, linkedin: e.target.value }))}
                    className="block w-full pl-10 rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="LinkedIn Profile"
                  />
                </motion.div>

                <div>
                  <input
                    type="text"
                    value={profile.company}
                    onChange={e => setProfile(prev => ({ ...prev, company: e.target.value }))}
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Company"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={e => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Location"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Profile'}
              </motion.button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default App;