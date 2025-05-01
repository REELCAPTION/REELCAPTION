'use client';
import { motion } from 'framer-motion';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { Instagram, Facebook, Linkedin, ChevronDown, ChevronUp } from "lucide-react";

export default function Footer() {
  const [openSections, setOpenSections] = useState({
    quickLinks: false,
    legal: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <footer className="bg-black/80 backdrop-blur-md border-t border-gray-800 w-full">
      
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="flex flex-col">
              <div>
                <Link href="/" className="inline-block mb-2">
                  <motion.span 
                    whileHover={{ scale: 1.02 }}
                    className="text-2xl font-black bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"
                  >
                    REELCAPTION
                  </motion.span>
                </Link>
                <p className="text-gray-400 text-sm">
                  AI-powered captions in seconds
                </p>
              </div>
              
              {/* Social Icons */}
              <div className="mt-4">
                <div className="flex gap-3">
                  {[
                    { icon: Instagram, url: "#" },
                    { icon: Facebook, url: "#" }, 
                    { icon: Linkedin, url: "#" }
                  ].map((social, i) => (
                    <Link href={social.url} key={i} aria-label={`Follow us on ${social.icon.displayName}`}>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-full hover:bg-gradient-to-r from-blue-500/20 to-purple-600/20 transition-colors"
                      >
                        <social.icon className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <div className="hidden md:block">
              <h3 className="text-white font-medium mb-3 text-sm">Quick Links</h3>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Blog'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="group inline-block">
                      <span className="text-gray-400 group-hover:text-white text-xs transition-colors">
                        {item}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Accordion */}
            <div className="md:hidden">
              <button 
                onClick={() => toggleSection('quickLinks')}
                className="flex items-center justify-between w-full text-white py-2"
                aria-expanded={openSections.quickLinks}
              >
                <span className="font-medium text-sm">Quick Links</span>
                {openSections.quickLinks ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openSections.quickLinks && (
                <ul className="space-y-2 pb-2">
                  {['Features', 'Pricing', 'Blog'].map((item) => (
                    <li key={item}>
                      <Link 
                        href="#" 
                        className="text-gray-400 hover:text-white text-xs block py-1 pl-2"
                        onClick={() => setOpenSections(prev => ({ ...prev, quickLinks: false }))}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Legal Links */}
          <div className="md:col-span-1">
            <div className="hidden md:block">
              <h3 className="text-white font-medium mb-3 text-sm">Legal</h3>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="group inline-block">
                      <span className="text-gray-400 group-hover:text-white text-xs transition-colors">
                        {item}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Accordion */}
            <div className="md:hidden">
              <button 
                onClick={() => toggleSection('legal')}
                className="flex items-center justify-between w-full text-white py-2"
                aria-expanded={openSections.legal}
              >
                <span className="font-medium text-sm">Legal</span>
                {openSections.legal ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openSections.legal && (
                <ul className="space-y-2 pb-2">
                  {['Privacy Policy', 'Terms of Service'].map((item) => (
                    <li key={item}>
                      <Link 
                        href="#" 
                        className="text-gray-400 hover:text-white text-xs block py-1 pl-2"
                        onClick={() => setOpenSections(prev => ({ ...prev, legal: false }))}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="py-4 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-gray-500 text-xs text-center md:text-left">
              © {new Date().getFullYear()} REELCAPTION. All rights reserved.
            </p>
          </div>
        </div>
      </div>

    </footer>
  );
}