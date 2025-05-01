'use client';
import { motion } from 'framer-motion';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from 'next/image';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 bg-neutral-800 backdrop-blur-sm px-4 py-3 w-full border-b"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center"
          >
            {/* Logo Image */}
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mr-2">
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
              <span className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                REELCAPTION
              </span>
              {/* Optional underline effect */}
              <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"></div>
            </div>
          </motion.div>
        </Link>

        {/* Navigation - Shows both buttons on desktop/tablet, only Login on mobile */}
        <div className="flex items-center gap-2">
          {/* Always show Login button */}
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="bg-white text-black hover:bg-black hover:text-white transition-colors"
              asChild
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Login
              </motion.div>
            </Button>
          </Link>

          {/* Show Sign Up only on md screens and larger */}
          <div className="hidden md:block">
            <Link href="/auth/signup">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md transition-all"
                asChild
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign Up
                </motion.div>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}