'use client';
import Image from "next/image";
import { JSX, useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';

type Profile = {
  id: string;
  email: string;
  name: string;
  country: string;
  credits: number;
  created_at: string;
};

type ContentTool = {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  path: string;
  credits: number;
  color: string;
};

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeToolIndex, setActiveToolIndex] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const contentTools: ContentTool[] = [
    {
      id: 'tweet-gen',
      name: 'Viral Tweet Generator',
      description: 'Create tweets that drive engagement and go viral',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
      path: '/post-login',
      credits: 1,
      color: 'bg-blue-500'
    },
    {
      id: 'instagram-caption',
      name: 'Instagram Bio & Caption',
      description: 'Stand out with engaging captions and bios',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      ),
      path: '/post-login',
      credits: 1,
      color: 'bg-pink-500'
    },
    {
      id: 'youtube-titles',
      name: 'YouTube Hook & Title',
      description: 'Get more views with catchy titles and hooks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
        </svg>
      ),
      path: '/post-login',
      credits: 2,
      color: 'bg-red-500'
    },
    {
      id: 'content-gen',
      name: 'AI Content Generator',
      description: 'Create engaging posts for any platform',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      ),
      path: '/post-login',
      credits: 3,
      color: 'bg-purple-500'
    },
    {
      id: 'hashtag-tool',
      name: 'Hashtag Suggestion Tool',
      description: 'Optimize reach with trending hashtags',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
        </svg>
      ),
      path: '/post-login',
      credits: 1,
      color: 'bg-teal-500'
    },
    {
      id: 'video-ideas',
      name: 'AI Video Idea Generator',
      description: 'Never run out of content ideas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      path: '/post-login',
      credits: 2,
      color: 'bg-orange-500'
    }
  ];

  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Handle click outside to close profile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuRef]);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivities(data || []);
    };

    fetchActivities();
  }, [supabase]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/auth/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        setProfile(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const nextTool = () => {
    setActiveToolIndex((prev) =>
      prev === contentTools.length - 1 ? 0 : prev + 1
    );
  };

  const prevTool = () => {
    setActiveToolIndex((prev) =>
      prev === 0 ? contentTools.length - 1 : prev - 1
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 text-white p-4">
        <div className="w-full max-w-4xl space-y-8 bg-gray-900/50 p-8 rounded-xl shadow-2xl border border-gray-800 text-center backdrop-blur-sm">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"
          />
          <motion.p
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
          >
            Loading your dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 text-white">
      {/* Glass Orbs Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="bg-gray-900/80 shadow-lg backdrop-blur-md border-b border-gray-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Logo/Brand */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center"
              >
                {/* Logo Image */}
                <div className="relative h-4 w-4 sm:h-10 sm:w-10 md:h-12 md:w-12 mr-2">
                  <Image
                    src="/images/Logo.png"
                    alt=""
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                {/* REELCAPTION Text */}
                <div className="flex flex-col">
                  <span className="text-sm sm:text-2xl md:text-2xl font-black bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                    REELCAPTION
                  </span>
                  {/* Optional underline effect */}
                  <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"></div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="hidden md:flex items-center bg-gradient-to-r from-gray-800/70 to-gray-800/40 rounded-full px-4 py-2 border border-gray-700/50 hover:border-yellow-500/50 transition-all shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{profile?.credits || 0} Credits</span>
            </motion.div>

            <div className="relative" ref={profileMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleProfileMenu}
                className="flex items-center space-x-2 bg-gradient-to-r from-gray-800/70 to-gray-800/40 hover:from-gray-700/70 hover:to-gray-700/40 rounded-full px-4 py-2 border border-gray-700/50 transition-all shadow-md cursor-pointer"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-bold shadow-md">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline">{profile?.name || 'User'}</span>
              </motion.button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-60 bg-gray-800/90 rounded-xl shadow-2xl py-2 z-10 backdrop-blur-md border border-gray-700/50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-700/50">
                      <p className="text-sm text-gray-300">Signed in as</p>
                      <p className="text-sm font-medium truncate">{profile?.email || 'user@example.com'}</p>
                    </div>

                    <div className="py-1">
                      <Link href="/dashboard/profile">
                        <motion.div
                          whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.3)' }}
                          className="flex items-center px-4 py-2 text-sm hover:bg-gray-700/20 transition-all cursor-pointer"
                        >
                          <FiUser className="mr-3 text-gray-400" />
                          Your Profile
                        </motion.div>
                      </Link>
                    </div>

                    <div className="py-1 border-t border-gray-700/50">
                      <motion.button
                        onClick={handleSignOut}
                        whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.3)' }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-700/20 transition-all text-red-400 cursor-pointer"
                      >
                        <FiLogOut className="mr-3" />
                        Sign Out
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-indigo-900/40 via-gray-900/50 to-purple-900/30 rounded-2xl p-8 shadow-xl border border-indigo-800/30 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Welcome back, <span className="bg-gradient-to-r from-indigo-300 to-purple-400 bg-clip-text text-transparent">{profile?.name || 'Creator'}!</span>
              </h1>
              <p className="text-gray-300 max-w-2xl">
                Ready to create some amazing content? You have <span className="text-yellow-400 font-medium">{profile?.credits || 0} credits</span> available.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link href="/post-login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-6 py-3 font-medium transition-all shadow-lg hover:shadow-indigo-500/30"
                >
                  Start Creating
                </motion.button>
              </Link>
              <Link href="/post-login/pricing">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(75, 85, 99, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-800/60 hover:bg-gray-700/70 text-white rounded-xl px-6 py-3 font-medium border border-gray-700/50 transition-all shadow-lg"
                >
                  Upgrade Plan
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tools Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Tools Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-900/40 rounded-2xl p-6 shadow-xl border border-gray-800/50 backdrop-blur-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Your Content Tools</h2>
                <Link href="/post-login">
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center cursor-pointer"
                  >
                    View All Tools <FiChevronRight className="ml-1" />
                  </motion.div>
                </Link>
              </div>

              <div className="relative">
                <div className="overflow-hidden">
                  <motion.div
                    key={activeToolIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/50 transition-all shadow-lg"
                  >
                    <div className="flex flex-col md:flex-row items-start">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`w-16 h-16 rounded-xl ${contentTools[activeToolIndex].color} flex items-center justify-center text-white text-2xl mb-4 md:mb-0 md:mr-6 shadow-lg`}
                      >
                        {contentTools[activeToolIndex].icon}
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-1">{contentTools[activeToolIndex].name}</h3>
                        <p className="text-gray-400 mb-4">{contentTools[activeToolIndex].description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-yellow-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {contentTools[activeToolIndex].credits} Credits
                          </div>
                          <Link href={contentTools[activeToolIndex].path}>
                            <motion.button
                              whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)" }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg px-4 py-2 font-medium transition-all shadow-md"
                            >
                              Use Tool
                            </motion.button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
                {/* Carousel Controls */}
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(75, 85, 99, 0.8)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevTool}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 bg-gray-800/50 hover:bg-gray-700 text-white rounded-full p-3 shadow-lg backdrop-blur-sm border border-gray-700/50 cursor-pointer"
                  aria-label="Previous Tool"
                >
                  <FiChevronLeft size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(75, 85, 99, 0.8)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextTool}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gray-800/50 hover:bg-gray-700 text-white rounded-full p-3 shadow-lg backdrop-blur-sm border border-gray-700/50 cursor-pointer"
                  aria-label="Next Tool"
                >
                  <FiChevronRight size={20} />
                </motion.button>
              </div>

              {/* Tool Navigation Indicator */}
              <div className="flex justify-center mt-6 space-x-2">
                {contentTools.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-1.5 rounded-full ${index === activeToolIndex ? 'w-6 bg-indigo-500' : 'w-2 bg-gray-700'}`}
                    animate={{
                      width: index === activeToolIndex ? 24 : 8,
                      backgroundColor: index === activeToolIndex ? '#6366f1' : '#374151'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Most Popular Tools */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-900/40 rounded-2xl p-6 shadow-xl border border-gray-800/50 backdrop-blur-sm"
            >
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">Trending Tools</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentTools.slice(0, 4).map((tool, index) => (
                  <Link href={tool.path} key={tool.id}>
                    <motion.div
                      whileHover={{ scale: 1.03, boxShadow: "0 0 15px rgba(99, 102, 241, 0.2)" }}
                      className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 rounded-lg p-4 border border-gray-700/50 hover:border-indigo-500/50 transition-all cursor-pointer flex items-center space-x-3"
                    >
                      <div className={`w-10 h-10 rounded-lg ${tool.color} flex items-center justify-center text-white shadow-md`}>
                        {tool.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-200">{tool.name}</h3>
                        <div className="flex items-center text-xs text-yellow-400 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {tool.credits} Credits
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Credits Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl p-6 shadow-xl border border-indigo-800/30 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Your Credits</h2>
                <div className="flex items-center bg-gray-800/40 rounded-full px-3 py-1 border border-gray-700/50 text-sm">
                  <span className="text-yellow-400 font-medium">{profile?.credits || 0}</span>
                  <span className="text-gray-400 ml-1">remaining</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="w-full bg-gray-800/50 rounded-full h-2.5 mb-2">
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (profile?.credits || 0) / 100 * 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span>
                  <span>800</span>
                </div>
              </div>

              <Link href="/post-login/pricing">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-gray-900 font-medium rounded-lg py-2.5 transition-all shadow-md"
                >
                  Get More Credits
                </motion.button>
              </Link>
            </motion.div>

            {/* Recent Activities Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gray-900/40 rounded-2xl p-6 shadow-xl border border-gray-800/50 backdrop-blur-sm"
            >
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">Recent Activities</h2>
              {recentActivities.length === 0 ? (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-600 mb-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-400">No recent activities found.</p>
                  <p className="text-gray-500 text-sm mt-2">Start using tools to see your activity here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity, idx) => (
                    <motion.div
                      key={activity.id || idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <span className="text-gray-300">{activity.description || 'Activity'}</span>
                        </div>
                        <div className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</div>
                      </div>
                    </motion.div>
                  ))}
                  <div className="pt-2 text-center">
                    <Link href="/post-login/activity">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium inline-flex items-center"
                      >
                        View All Activity <FiChevronRight className="ml-1" />
                      </motion.button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-800/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-400 text-sm">© 2025 ContentAI Suite. All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/terms">
                <span className="text-gray-400 hover:text-gray-300 text-sm transition-colors cursor-pointer">Terms</span>
              </Link>
              <Link href="/privacy">
                <span className="text-gray-400 hover:text-gray-300 text-sm transition-colors cursor-pointer">Privacy</span>
              </Link>
              <Link href="/help">
                <span className="text-gray-400 hover:text-gray-300 text-sm transition-colors cursor-pointer">Help</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}