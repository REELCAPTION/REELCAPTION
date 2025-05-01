"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from 'next/link';

const tools = [
  {
    title: "Viral Tweet Generator",
    desc: "Craft engaging, high-performing tweets in seconds. Generate witty, trending, and audience-focused Twitter content effortlessly.",
    img: "/images/tool1.jpg",
    icon: "🚀"
  },
  {
    title: "Instagram Bio & Reel Caption Generator",
    desc: "Stand out on Instagram with AI-crafted bios and catchy reel captions that boost engagement and followers.",
    img: "/images/tool2.jpg",
    icon: "📸"
  },
  {
    title: "YouTube Hook Analyzer + AI Title Generator",
    desc: "Analyze your YouTube hooks and generate irresistible AI-powered video titles to maximize views and clicks.",
    img: "/images/tool3.jpg",
    icon: "▶️"
  },
  {
    title: "Content Generator",
    desc: "Create high-quality content ideas tailored to your niche. Instantly generate captions, hooks, and post ideas to keep your audience engaged.",
    img: "/images/tool4.png",
    icon: "🎨"
  },
  {
    title: "Hashtag Suggestion Tool",
    desc: "Find the best hashtags for your content to increase reach and discoverability across all platforms.",
    img: "/images/tool5.png",
    icon: "#️⃣"
  },
  {
    title: "AI Video Idea Generator",
    desc: "Never run out of ideas! Instantly generate fresh, creative video topics tailored to your niche.",
    img: "/images/tool6.jpg",
    icon: "💡"
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function HeroSection() {
  return (
    <div className="bg-neutral-900 min-h-screen flex flex-col items-center px-6 py-12 sm:px-8 overflow-hidden">
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.8 }}
        className="w-full max-w-6xl flex flex-col items-center text-center mb-24"
      >
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          Elevate Your Content<br />
          <span className="text-2xl sm:text-3xl font-medium text-neutral-300 mt-4 block">
            with AI-Powered Social Mastery
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-neutral-400 max-w-3xl mb-10">
          Transform your social media presence with our all-in-one creator toolkit
        </p>

        <Link href="/signup">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 bg-white text-neutral-900 font-bold rounded-full shadow-lg hover:shadow-neutral-300/30 transition-all"
          >
            Get Started - It's Free
          </motion.button>
        </Link>



        <div className="mt-16 w-full max-w-4xl h-px bg-neutral-800" />
      </motion.section>

      {/* Tools Section */}
      <section className="w-full max-w-7xl flex flex-col gap-24">
        {tools.map((tool, idx) => (
          <motion.div
            key={tool.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
            className={`flex flex-col ${idx % 2 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10`}
          >
            <div className="relative flex-1 max-w-md">
              <div className="relative bg-neutral-800/80 backdrop-blur-sm p-1 rounded-2xl border border-neutral-700 shadow-xl overflow-hidden group">
                <div className="absolute top-4 left-4 text-2xl z-10">{tool.icon}</div>
                <img
                  src={tool.img}
                  alt={tool.title}
                  className="w-full h-auto rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            <div className="flex-1 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                {tool.title}
              </h2>
              <p className="text-lg text-neutral-300 mb-6 leading-relaxed">{tool.desc}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Final CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        variants={fadeIn}
        viewport={{ once: true }}
        className="w-full max-w-4xl mt-32 mb-20 text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12">
          Ready to transform your content?
        </h2>

        <p className="text-xl text-neutral-400 mb-10 max-w-3xl mx-auto">
          Join thousands of creators already boosting their engagement daily
        </p>

        <Link href="/auth/signup">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-12 py-4 bg-white text-neutral-900 font-bold rounded-full shadow-lg hover:shadow-neutral-300/30 transition-all"
          >
            Start Creating Now
          </motion.button>
        </Link>

        <div className="mt-10 flex flex-col items-center">
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="text-yellow-400 text-xl">★</div>
            ))}
          </div>
          <span className="text-neutral-400">Trusted by creators worldwide</span>
        </div>
      </motion.section>
    </div>
  );
}
