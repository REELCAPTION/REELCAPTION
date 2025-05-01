"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./slider"; // Double-check this import path
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const toolOptions = [
  { id: "tool1", name: "Viral Tweet Generator", path: "tweet" },
  { id: "tool2", name: "Instagram Bio & Reel Caption Generator", path: "caption" },
  { id: "tool3", name: "YouTube Hook Analyzer + AI Title Generator", path: "analyzer" },
  { id: "tool4", name: "Content Generator", path: "content" },
  { id: "tool5", name: "Hashtag Suggestion Tool", path: "hashtag" },
  { id: "tool6", name: "AI Video Idea Generator", path: "aivideo" },
];

export default function Page() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>("tool1");
  const [ToolComponent, setToolComponent] = useState<React.ComponentType | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch user profile from correct table name
          const { data, error } = await supabase
            .from('user_profiles')  // Changed from 'users' to 'user_profiles'
            .select('credits, email, name')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          if (data) {
            setCredits(data.credits);
            setUserEmail(data.email || "");
            setUserName(data.name || "");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [supabase]);

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const loadTool = async () => {
      try {
        const toolPath = toolOptions.find(tool => tool.id === selectedTool)?.path;
        if (!toolPath) return;

        const module = await import(`@/app/post-login/tools/${toolPath}/page`);
        setToolComponent(() => module.default);
      } catch (err) {
        console.error("Module load error:", err);
        setToolComponent(null);
      }
    };

    loadTool();
  }, [selectedTool]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-black w-full relative">
      

      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        selectedTool={selectedTool}
        setSelectedTool={handleToolSelect}
        toolOptions={toolOptions}
        loading={false}
        profile={{ full_name: userName }}
        user={{ email: userEmail }}
        signOut={handleSignOut}
      />

      <div className="flex-1 overflow-auto">
        {ToolComponent ? (
          <div className="w-full min-h-full">
            <ToolComponent />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <p className="text-lg">Select a tool to view content.</p>
          </div>
        )}
      </div>
    </div>
  );
}