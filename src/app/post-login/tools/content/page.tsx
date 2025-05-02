// src/app/post-login/tools/content/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Copy, RotateCcw, Save, Users, MessageSquare, Hash, Info, AlertTriangle, X, CreditCard, ExternalLink, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Database } from '@/types_db';
import Link from 'next/link';

// --- Configuration Data --- (Moved outside component for clarity)
const contentTypes = [
  { value: 'instagram', label: 'Instagram Caption' },
  { value: 'linkedin', label: 'LinkedIn Post' },
  { value: 'facebook', label: 'Facebook Post' },
  { value: 'twitter', label: 'Twitter Thread Hook' }, // Changed from 'Tweet'
  { value: 'youtube', label: 'YouTube Description Snippet' }, // Changed from 'Description'
  { value: 'blog_intro', label: 'Blog Post Intro' }, // Changed from 'Paragraph'
  { value: 'short_hook', label: 'Short-form Video Hook' }, // Changed from 'hook'
  { value: 'ad_copy', label: 'Ad Copy (Short)' }, // Changed from 'ad'
  { value: 'product_desc', label: 'Product Description' }, // Changed from 'product'
  { value: 'email_subject', label: 'Email Subject Line' } // Changed from 'story'
];

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'funny', label: 'Funny' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'bold', label: 'Bold' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'urgent', label: 'Urgent' }
];

const audiences = [
  { value: 'general', label: 'General Public' },
  { value: 'genz', label: 'Gen Z (Youth)' },
  { value: 'millennials', label: 'Millennials' },
  { value: 'professionals', label: 'Business Professionals' },
  { value: 'entrepreneurs', label: 'Entrepreneurs / Startups' },
  { value: 'tech_enthusiasts', label: 'Tech Enthusiasts' },
  { value: 'creators', label: 'Content Creators' },
  { value: 'marketers', label: 'Marketers' },
  { value: 'students', label: 'Students' },
  { value: 'custom', label: 'Custom Audience...' }
];

const lengths = [
  { value: 'short', label: 'Short (~1-3 sentences)' },
  { value: 'medium', label: 'Medium (~4-6 sentences)' },
  { value: 'long', label: 'Long (~1-2 paragraphs)' }
];

const exampleContents = [
  {
    type: 'Instagram Caption',
    topic: 'Showcasing a new sustainable clothing line',
    content: "🌿 Conscious fashion just got an upgrade! ✨ So excited to introduce our latest collection crafted from recycled materials. Style meets sustainability in every stitch.\n\nFeel good, look good, do good. What piece are you loving most?\n\nShop the link in bio! 👇\n\n#SustainableFashion #EcoFriendly #SlowFashion #EthicalClothing #NewCollection #ConsciousConsumer"
  },
  {
    type: 'LinkedIn Post',
    topic: 'Key takeaways from a recent industry conference',
    content: "🚀 Reflecting on an insightful week at #IndustryConf2024! Key takeaways:\n\n1️⃣ AI Integration is no longer optional, it's essential for efficiency.\n2️⃣ Personalization at scale is the future of customer engagement.\n3️⃣ Building authentic community remains paramount in the digital age.\n\nExcited to implement these learnings! What were your biggest insights from recent events?\n\n#LinkedInLearning #ProfessionalDevelopment #FutureOfWork #Networking #AI #MarketingTrends"
  },
  {
    type: 'Short-form Video Hook',
    topic: 'Quick tip for better focus',
    content: "Struggling to focus? Try THIS 🤯 The 'Pomodoro Technique' changed my life..."
  }
];

// Define Credit Costs
const CREDIT_COSTS = {
  basic: 2,
  premium: 5, // Example premium cost
};


export default function ContentGeneratorPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  // Optional: const { toast } = useToast();

  // --- State ---
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic');
  const [contentType, setContentType] = useState('instagram');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('general');
  const [customAudience, setCustomAudience] = useState('');
  const [length, setLength] = useState('medium');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  // Variations are often a premium feature, let's tie it to the premium tab
  // const [generateVariations, setGenerateVariations] = useState(false);
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [error, setError] = useState<string | null>(null); // For general errors
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [showOutOfCreditsAlert, setShowOutOfCreditsAlert] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(CREDIT_COSTS.basic);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // For collapsible section


  // --- Fetch User Credits ---
  useEffect(() => {
    const fetchCredits = async () => {
      console.log("[Client] Fetching user credits...");
      setIsLoadingCredits(true);
      setError(null);
      setShowOutOfCreditsAlert(false);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`);
        if (!session?.user) throw new Error('Not authenticated');

        const { data, error: profileError, status } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          if (status === 406 || profileError.code === 'PGRST116') {
            console.error("[Client] User profile not found ID:", session.user.id);
            throw new Error('User profile not found. Please contact support.');
          } else {
            console.error("[Client] Supabase profile fetch error:", profileError);
            throw new Error(`Failed to fetch credits: ${profileError.message}`);
          }
        } else if (data && typeof data.credits === 'number') {
          setCurrentCredits(data.credits);
          console.log(`[Client] Credits loaded: ${data.credits}`);
        } else {
          console.warn("[Client] Profile data missing or credits invalid.");
          throw new Error('Could not retrieve valid credit information.');
        }
      } catch (err: unknown) { // Corrected: Replaced any with unknown
        console.error("[Client] Error fetching credits:", err);
        // Corrected: Safely access message property
        const message = (err instanceof Error) ? err.message : 'Could not load user credits.';
        setError(message);
        setCurrentCredits(null);
        if (message.includes('Not authenticated')) { // Basic check for auth error message
          console.log("[Client] User not authenticated. Redirecting...");
          router.push('/login');
        } else if (message.includes('User profile not found')) {
          // Specific handling if needed
        }
      } finally {
        setIsLoadingCredits(false);
      }
    };
    fetchCredits();
  }, [supabase, router]);

  // Update required credits when tab changes
  useEffect(() => {
    setRequiredCredits(CREDIT_COSTS[activeTab]);
    // Automatically disable variations if not on premium tab? Optional UX choice.
    // if (activeTab === 'basic') {
    //   setGenerateVariations(false);
    // }
  }, [activeTab]);

  // Update generated content when selected variation changes
  useEffect(() => {
    if (variations.length > 0 && selectedVariationIndex < variations.length) {
      setGeneratedContent(variations[selectedVariationIndex]);
    }
  }, [selectedVariationIndex, variations]);

  // --- Event Handlers ---
  const handleGenerate = async () => {
    setError(null);
    setShowOutOfCreditsAlert(false);

    if (!topic || topic.trim().length === 0) {
      setError("Please enter a Topic / Idea first.");
      // toast({ variant: "destructive", title: "Input Missing" });
      return;
    };
    if (audience === 'custom' && !customAudience.trim()) {
      setError("Please describe your custom audience.");
      return;
    }
    if (currentCredits === null || isLoadingCredits) {
      setError("Cannot generate: Credit information is unavailable.");
      // toast({ variant: "destructive", title: "Loading..." });
      return;
    }

    const creditsToUse = requiredCredits;
    const generateVariations = activeTab === 'premium'; // Generate variations only for premium

    // --- Frontend Credit Check ---
    if (currentCredits < creditsToUse) {
      console.log(`[Client] Insufficient credits. Needed: ${creditsToUse}, Available: ${currentCredits}`);
      setShowOutOfCreditsAlert(true);
      // toast({ variant: "destructive", title: "Insufficient Credits" });
      return;
    }

    // --- Start Generation Process ---
    setIsGenerating(true);
    setGeneratedContent(''); // Clear previous results
    setGeneratedHashtags([]);
    setVariations([]);
    setSelectedVariationIndex(0);

    console.log(`[Client] Starting content generation. Cost: ${creditsToUse}, Mode: ${activeTab}, Variations: ${generateVariations}`);

    try {
      const response = await fetch('/api/content', { // Ensure '/api/content' is correct
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          contentType,
          tone,
          audience: audience === 'custom' ? customAudience.trim() : audience, // Send custom audience text if selected
          length,
          includeHashtags,
          includeCta,
          generateVariations, // Send flag based on activeTab
          credits: creditsToUse, // Send required credits
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Client] API Error (${response.status}):`, data);
        if (response.status === 402 && data.errorCode === 'INSUFFICIENT_CREDITS') {
          setShowOutOfCreditsAlert(true);
          if (typeof data.currentCredits === 'number') setCurrentCredits(data.currentCredits);
        } else if (response.status === 401) {
          setError('Authentication error. Please log in again.');
          router.push('/login');
        } else {
          throw new Error(data.error || `API request failed with status ${response.status}`);
        }
      } else {
        // --- Success ---
        console.log("[Client] Generation successful:", data);

        // Handle Variations vs Single Content
        if (generateVariations && data.variations && Array.isArray(data.variations) && data.variations.length > 0) {
          setVariations(data.variations);
          setGeneratedContent(data.variations[0]); // Show first variation initially
          setSelectedVariationIndex(0);
        } else if (data.content) {
          setVariations([data.content]); // Store single result as a one-item array
          setGeneratedContent(data.content);
          setSelectedVariationIndex(0);
        } else {
          console.warn("[Client] API response missing 'content' or 'variations'.");
          setError("Generation succeeded, but no content was returned. Please try again.");
          setVariations([]);
          setGeneratedContent('');
        }

        // Handle Hashtags
        if (includeHashtags && data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) {
          setGeneratedHashtags(data.hashtags);
        } else {
          setGeneratedHashtags([]);
        }

        // Update Credits
        if (typeof data.remainingCredits === 'number') {
          setCurrentCredits(data.remainingCredits);
          console.log(`[Client] Credits updated locally to: ${data.remainingCredits}`);
          // toast({ title: "Content Generated!", description: `Used ${creditsToUse} credit(s).` });
        } else {
          console.warn("[Client] API success response missing remainingCredits. Deducting locally.");
          if (currentCredits !== null) { // Only deduct if currentCredits is known
            setCurrentCredits(currentCredits - creditsToUse); // Fallback
          } else {
            // Cannot deduct, maybe refetch credits?
            // fetchCredits(); // Consider refetching credits if they were null before
          }
          // toast({ title: "Content Generated!", description: `Used ${creditsToUse} credit(s). (Local fallback)` });
        }
      }
    } catch (err: unknown) { // Corrected: Replaced any with unknown
      console.error('[Client] Error in handleGenerate:', err);
      // Corrected: Safely access message property
      const message = (err instanceof Error) ? err.message : 'An unexpected error occurred during generation.';
      if (!showOutOfCreditsAlert) { // Avoid overwriting the credit alert message
        setError(message);
      }
      // toast({ variant: "destructive", title: "Generation Failed", description: message });
      setGeneratedContent(''); // Clear results on error
      setGeneratedHashtags([]);
      setVariations([]);
      setSelectedVariationIndex(0);
    } finally {
      setIsGenerating(false);
      console.log("[Client] Generation process finished.");
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent)
      .then(() => {
        console.log("[Client] Content copied.");
        // toast({ title: "Copied!", description: "Content copied to clipboard." });
        // Add visual feedback?
      })
      .catch(err => {
        console.error("[Client] Copy failed:", err);
        setError("Failed to copy content.");
        // toast({ variant: "destructive", title: "Copy Failed" });
      });
  };

  const handleCopyHashtags = () => {
    if (!generatedHashtags.length) return;
    navigator.clipboard.writeText(generatedHashtags.join(' '))
      .then(() => {
        console.log("[Client] Hashtags copied.");
        // toast({ title: "Hashtags Copied!", description: `${generatedHashtags.length} hashtags copied.` });
      })
      .catch(err => {
        console.error("[Client] Hashtag copy failed:", err);
        setError("Failed to copy hashtags.");
        // toast({ variant: "destructive", title: "Copy Failed" });
      });
  };


  const handleReset = () => {
    setTopic('');
    setGeneratedContent('');
    setGeneratedHashtags([]);
    setVariations([]);
    setSelectedVariationIndex(0);
    setError(null);
    setShowOutOfCreditsAlert(false);
    // Reset options?
    setContentType('instagram');
    setTone('professional');
    setAudience('general');
    setCustomAudience('');
    setLength('medium');
    setIncludeHashtags(true);
    setIncludeCta(true);
    // setActiveTab('basic'); // Keep tab or reset? Let's keep it.
    console.log("[Client] Form reset.");
    // toast({ title: "Form Reset" });
  };

  const handleSave = () => { // Placeholder
    if (!generatedContent) return;
    console.log("[Client] Saving content (placeholder):", generatedContent);
    alert('Save functionality is not implemented yet.');
    // toast({ title: "Save Clicked", description: "Save coming soon!" });
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-black text-white my-14 lg:my-0 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2.5">
              <Sparkles className="text-blue-400 h-7 w-7" />
              AI Content Generator
            </h1>
            <p className="text-gray-300 text-lg">Craft engaging content for any platform and audience</p>
          </div>
        </div>

        {/* --- Error & Notice Area --- */}
        {/* 1. Out of Credits Alert */}
        {showOutOfCreditsAlert && (
          <Card className="bg-yellow-900/80 border border-yellow-700 text-yellow-100 mt-4">
            <CardHeader className='p-3'>
              <div className='flex justify-between items-center'>
                <CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16} /> Insufficient Credits</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowOutOfCreditsAlert(false)} className='text-yellow-100 hover:bg-yellow-800/50 h-auto p-1 rounded-full' aria-label="Close insufficient credits alert"><X size={18} /></Button>
              </div>
            </CardHeader>
            <CardContent className='p-3 pt-0 text-sm space-y-2'>
              <p>You need {requiredCredits} credit{requiredCredits > 1 ? 's' : ''} for {activeTab} generation, but only have {currentCredits ?? 0}.</p>
              <Button asChild variant="default" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs h-8 px-3">
                <Link href='/post-login/pricing'> {/* ** CHECK LINK ** */}
                  <CreditCard className='h-4 w-4 mr-1.5' /> Please upgrade your plan.<ExternalLink className='h-3 w-3 ml-1 opacity-70' />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {/* 2. General Errors */}
        {error && !isLoadingCredits && !showOutOfCreditsAlert && (
          <Card className="bg-red-900/80 border border-red-700 text-red-100 mt-4">
            <CardHeader className='p-3'>
              <div className='flex justify-between items-center'>
                <CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16} /> Error</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close error message"><X size={18} /></Button>
              </div>
            </CardHeader>
            <CardContent className='p-3 pt-0 text-sm'>{error}</CardContent>
          </Card>
        )}
        {/* 3. Initial Credit Loading Error */}
        {error && isLoadingCredits && (
          <Card className="bg-gray-800 border border-gray-700 text-gray-300 mt-4">
            <CardHeader className='p-3'><CardTitle className='text-base flex items-center gap-2'><Info size={16} /> Notice</CardTitle></CardHeader>
            <CardContent className='p-3 pt-0 text-sm'>{error} Could not load credit details. Please refresh or try logging in again.</CardContent>
          </Card>
        )}
        {/* --- End Error Area --- */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* Input Section (Column 1) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl md:text-2xl text-white">Content Configuration</CardTitle>
                <CardDescription className="text-gray-400 text-sm md:text-base pt-1">
                  Tailor the AI to generate your perfect content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5">
                {/* Topic Input */}
                <div className="space-y-2">
                  <Label htmlFor='topic-textarea-content' className="text-sm font-medium text-gray-300 flex items-center gap-1.5">Topic / Idea / Keywords <span className="text-red-400">*</span></Label>
                  <Textarea
                    id='topic-textarea-content'
                    placeholder="e.g., 'benefits of meditation for entrepreneurs', 'launching a new eco-friendly product', 'quick tips for social media growth'"
                    className="bg-gray-950 border-gray-700 h-32 md:h-36 text-base p-4 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md resize-none"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={500}
                    required
                    aria-required="true"
                  />
                </div>

                {/* Content Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="content-type-select" className="text-sm font-medium text-gray-300">Content Type</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger id="content-type-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full">
                      <SelectValue placeholder="Select content type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">
                      {contentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* --- Advanced Options Toggle --- */}
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
                >
                  <span className='flex items-center gap-2'><Settings2 size={16} className="text-gray-400" /> Advanced Options</span>
                  {showAdvancedOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {/* --- Collapsible Advanced Options --- */}
                {showAdvancedOptions && (
                  <div className="space-y-5 pt-3 border-t border-gray-800/50 mt-1 animate-fadeIn"> {/* Simple fade-in animation */}
                    {/* Tone Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-300">Tone of Voice</Label>
                      <ToggleGroup
                        type="single"
                        value={tone}
                        onValueChange={(value) => value && setTone(value)}
                        className="grid grid-cols-3 gap-2"
                      >
                        {tones.slice(0, 6).map((t) => ( // Show first 6 common tones
                          <ToggleGroupItem
                            key={t.value}
                            value={t.value}
                            className="text-xs md:text-[13px] data-[state=on]:bg-blue-600 data-[state=on]:text-white border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md h-9 px-2"
                            title={t.label}
                          >
                            {t.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      {/* Optional: Add a Select for less common tones */}
                    </div>

                    {/* Audience Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="audience-select" className="text-sm font-medium text-gray-300">Target Audience</Label>
                      <Select value={audience} onValueChange={setAudience}>
                        <SelectTrigger id="audience-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <SelectValue placeholder="Select audience..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">
                          {audiences.map((a) => (
                            <SelectItem key={a.value} value={a.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Audience Input */}
                    {audience === 'custom' && (
                      <div className="space-y-2 pl-2 animate-fadeIn">
                        <Label htmlFor="custom-audience-input" className="text-sm font-medium text-yellow-300">Describe Custom Audience</Label>
                        <Input
                          id="custom-audience-input"
                          placeholder="e.g., 'small business owners in SaaS', 'busy moms looking for quick recipes'"
                          className="bg-gray-950 border-yellow-700/50 text-white placeholder:text-gray-500 focus:border-yellow-600 focus:ring-yellow-600 rounded-md"
                          value={customAudience}
                          onChange={(e) => setCustomAudience(e.target.value)}
                          maxLength={150}
                        />
                      </div>
                    )}

                    {/* Content Length Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="length-select" className="text-sm font-medium text-gray-300">Desired Content Length</Label>
                      <Select value={length} onValueChange={setLength}>
                        <SelectTrigger id="length-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full">
                          <SelectValue placeholder="Select length..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">
                          {lengths.map((l) => (
                            <SelectItem key={l.value} value={l.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Enhancements Checkboxes */}
                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-medium text-gray-300 block mb-2">Optional Elements</Label>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="hashtags"
                          checked={includeHashtags}
                          onCheckedChange={(checked) => setIncludeHashtags(Boolean(checked))}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-gray-600"
                        />
                        <Label htmlFor="hashtags" className="text-sm text-gray-300 font-normal cursor-pointer select-none">Include relevant #hashtags</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="cta"
                          checked={includeCta}
                          onCheckedChange={(checked) => setIncludeCta(Boolean(checked))}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-gray-600"
                        />
                        <Label htmlFor="cta" className="text-sm text-gray-300 font-normal cursor-pointer select-none">Suggest a Call-to-Action (CTA)</Label>
                      </div>
                      {/* Variation checkbox only if premium */}
                      {/* <div className="flex items-center space-x-3">
                               <Checkbox
                                  id="variations"
                                  checked={activeTab === 'premium'} // Linked to premium tab
                                  disabled // Maybe make it display only
                                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 border-gray-600"
                               />
                               <Label htmlFor="variations" className={`text-sm font-normal ${activeTab === 'premium' ? 'text-purple-300' : 'text-gray-500'}`}>
                                   Generate Multiple Variations (Premium Only)
                               </Label>
                           </div> */}
                    </div>
                  </div>
                )}
                {/* --- End Collapsible Section --- */}

              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-5 px-5 pb-5 border-t border-gray-800 bg-gray-900/50">
                {/* Credit Selection Tabs */}
                <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'premium')}>
                  <TabsList className="grid grid-cols-2 w-full bg-gray-800 h-12 rounded-md p-1">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-medium">Standard</span>
                        <span className="text-[11px] text-gray-400 data-[state=active]:text-blue-100">({CREDIT_COSTS.basic} Credits)</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-medium">Advanced ✨</span>
                        <span className="text-[11px] text-gray-400 data-[state=active]:text-purple-100">({CREDIT_COSTS.premium} Credits)</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Credit Display */}
                <div className="text-center text-xs text-gray-400 w-full pt-1">
                  {isLoadingCredits ? (
                    <span className="inline-flex items-center gap-1 animate-pulse"><svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading credits...</span>
                  ) : currentCredits !== null ? (
                    <span>Credits Available: <strong className="text-white font-semibold">{currentCredits}</strong></span>
                  ) : (
                    <span className="text-red-400 font-medium">Credit info unavailable</span>
                  )}
                </div>

                {/* Generate Button */}
                <Button
                  type="button"
                  className={`w-full h-11 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg ${activeTab === 'basic'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                    }`}
                  onClick={handleGenerate}
                  disabled={!topic.trim() || (audience === 'custom' && !customAudience.trim()) || isGenerating || isLoadingCredits || currentCredits === null || showOutOfCreditsAlert}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Content <Sparkles className="h-5 w-5 ml-1.5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div> {/* End Input Column */}

          {/* Output Section (Column 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generated Content Card */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between pb-3 px-5 pt-5">
                <div className="space-y-1">
                  <CardTitle className="text-xl md:text-2xl text-white">Generated Content</CardTitle>
                  <CardDescription className="text-gray-400 text-sm md:text-base">
                    {variations.length > 1 ? 'Select a variation below or copy.' : 'Review your generated content.'}
                  </CardDescription>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleReset} disabled={isGenerating} title="Reset Form & Output">
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleCopy} disabled={!generatedContent || isGenerating} title="Copy Content">
                    <Copy className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleSave} disabled={!generatedContent || isGenerating} title="Save Content (Coming Soon)">
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Variation Selector */}
                {variations.length > 1 && !isGenerating && (
                  <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-800 mb-4">
                    <Label className="text-sm font-medium text-gray-400 whitespace-nowrap py-1.5 pr-2">Variations:</Label>
                    {variations.map((_, index) => (
                      <Badge
                        key={index}
                        variant={selectedVariationIndex === index ? 'default' : 'secondary'}
                        className={`cursor-pointer flex-shrink-0 px-3 py-1 text-sm transition-all ${selectedVariationIndex === index ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        onClick={() => setSelectedVariationIndex(index)}
                      >
                        {index + 1}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Content Textarea */}
                <div className="bg-black rounded-xl p-4 min-h-[18rem] md:min-h-[20rem] border border-gray-700 flex flex-col shadow-inner relative">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8 bg-black/60 backdrop-blur-sm z-10 rounded-xl">
                      <Sparkles className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-blue-400 animate-pulse" />
                      <p className="text-lg text-white font-medium animate-pulse">Generating Content...</p>
                      <p className="text-sm text-gray-400 animate-pulse">AI is crafting your text.</p>
                    </div>
                  ) : generatedContent ? (
                    <Textarea
                      readOnly
                      className="flex-grow bg-transparent border-none h-full text-base p-0 text-gray-100 placeholder:text-gray-500 resize-none focus:ring-0 focus:outline-none whitespace-pre-wrap" // Allow wrapping
                      value={generatedContent}
                      placeholder="Your content will appear here"
                    />
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-600 text-center p-4 md:p-8">
                      <MessageSquare className="h-12 w-12 md:h-16 md:w-16 mb-5 text-gray-700 opacity-80" />
                      {/* Corrected: Use single quotes inside double quotes */}
                      <p className="text-lg md:text-xl mb-2 text-gray-400 font-medium">&apos;Your content will show up here&apos;</p>
                      {/* Corrected: Use single quotes inside double quotes */}
                      <p className="text-gray-500 text-sm md:text-base max-w-xs mx-auto">&quot;Fill in the details on the left and click &apos;Generate Content&apos;.&quot;</p>
                    </div>
                  )}
                </div>

                {/* Hashtag Display Area */}
                {generatedHashtags.length > 0 && !isGenerating && (
                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><Hash size={14} /> Suggested Hashtags</Label>
                      <Button
                        variant="outline"
                        size="sm" // Changed from 'xs' to 'sm'
                        className="h-7 px-2 text-xs border-gray-700 hover:bg-gray-700/50"
                        onClick={handleCopyHashtags}
                        title="Copy Hashtags"
                      >
                        <Copy size={12} className="mr-1" /> Copy
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedHashtags.map((hashtag, index) => (
                        <Badge key={index} variant="secondary" className="bg-gray-800/80 border border-gray-700/50 text-gray-300 font-normal text-xs px-2 py-0.5 cursor-default">
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              {/* Removed Footer with buttons as they are moved to header */}
            </Card>

            {/* Examples Section */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-white">
                  <Star className="text-yellow-400 h-5 w-5" /> Examples
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {exampleContents.map((example, index) => (
                  <div key={index} className="bg-gray-800/50 border border-gray-700/60 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-300 mb-1">{example.type}</p>
                    <p className="text-xs text-gray-400 mb-2">
                      <span className="font-medium text-gray-300">Topic:</span> {example.topic}
                    </p>
                    <Textarea
                      readOnly
                      className="bg-gray-950 border-gray-700 h-28 text-sm p-3 text-gray-200 placeholder:text-gray-500 resize-none rounded-md focus:ring-0 focus:outline-none whitespace-pre-wrap"
                      value={example.content}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>



          </div> {/* End Output Column */}
        </div> {/* End Main Grid */}
      </div> {/* End Max Width Container */}

      {/* Add simple fade-in animation style */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

    </div> // End Page Root Div
  );
}