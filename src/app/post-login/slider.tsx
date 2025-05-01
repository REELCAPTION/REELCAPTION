"use client";
import { motion } from 'framer-motion';
import { FiX, FiMenu, FiUser } from "react-icons/fi";
import React from "react";
import Image from "next/image";
import Link from "next/link";

interface ToolOption {
  id: string;
  name: string;
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  selectedTool: string;
  setSelectedTool: (toolId: string) => void;
  toolOptions: ToolOption[];
  loading?: boolean;
  profile?: {
    full_name?: string;
  };
  user?: {
    email?: string;
  };
  signOut: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  selectedTool,
  setSelectedTool,
  toolOptions,
  loading = false,
  profile,
  user,
  signOut,
}) => {
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-black/80 text-white shadow-md"
        aria-label="Open menu"
      >
        <FiMenu size={24} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 h-full z-40 bg-black overflow-y-auto transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:relative lg:w-72 lg:flex lg:flex-col lg:border-r lg:border-gray-700
        `}
      >
        {/* Close button for mobile */}
        {isMobileMenuOpen && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 z-50 p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700/50"
            aria-label="Close menu"
          >
            <FiX size={24} />
          </button>
        )}

        <div className="h-full flex flex-col">
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

          {/* Profile Link */}
          <Link href="/dashboard" className="block">
            <div className="p-4 flex items-center space-x-3 border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                {loading ? (
                  <div className="animate-pulse bg-gray-700 w-full h-full"></div>
                ) : (
                  <Image
                    src="/images/default-avatar.png"
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {loading ? "Loading..." : (profile?.full_name || "My Profile")}
                </p>
                <p className="text-xs text-gray-400">
                  {loading ? "" : (user?.email || "View and edit profile")}
                </p>
              </div>
            </div>
          </Link>

          {/* Tools List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 px-2">
              Tools
            </h3>
            <nav className="space-y-2">
              {toolOptions.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setSelectedTool(tool.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-3 rounded-lg text-sm transition-colors ${
                    selectedTool === tool.id
                      ? "bg-blue-600/90 text-white font-semibold"
                      : "text-gray-300 hover:bg-gray-700/50"
                  }`}
                >
                  <span className="flex-1 text-left">{tool.name}</span>
                  {selectedTool === tool.id && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-blue-300" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Upgrade to Pro Section */}
          <div className="p-4 border-t border-gray-700">
            <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 rounded-xl p-4">
              <h3 className="font-medium text-white mb-1">Upgrade to Pro</h3>
              <p className="text-xs text-blue-200 mb-3">
                Get unlimited access to all tools
              </p>
              <Link href="/post-login/pricing">
                <button className="w-full py-2 bg-white text-blue-900 rounded-lg text-sm font-bold hover:bg-blue-50 transition">
                  Upgrade Now
                </button>
              </Link>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;