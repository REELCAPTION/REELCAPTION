// src/app/post-login/tools/analyzer/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Copy, RotateCcw, Save, PlayCircle, Target, TrendingUp, Info, AlertTriangle, X, CreditCard, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
// Optional: import { useToast } from "@/components/ui/use-toast";
import { Database } from '@/types_db';
import Link from 'next/link';

// --- Configuration Data (Keep as is) ---
const niches = [
    { value: 'technology', label: 'Technology' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'education', label: 'Education' },
    { value: 'business', label: 'Business' }
];

const hookStyles = [
    { value: 'question', label: 'Question' },
    { value: 'statistic', label: 'Statistic' },
    { value: 'controversial', label: 'Controversial' },
    { value: 'story', label: 'Story' },
    { value: 'problem', label: 'Problem-Solution' }
];

const titleStyles = [
    { value: 'howto', label: 'How-To' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'review', label: 'Review' },
    { value: 'comparison', label: 'Comparison' }
];

const audienceTypes = [
    { value: 'general', label: 'General' },
    { value: 'beginner', label: 'Beginners' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'professional', label: 'Professionals' }
];

const exampleHooks = [
    {
      topic: 'iPhone Photography',
      hook: "You're using the wrong iPhone camera settings! Here's what the pros never tell you...",
      title: "5 iPhone Camera Settings That Will Transform Your Photography Forever"
    },
    {
      topic: 'Personal Finance',
      hook: "This simple 50-30-20 rule could make you $100,000 richer in just 5 years...",
      title: "How I Saved $100K in 5 Years with the 50-30-20 Budget Rule (Step-By-Step Guide)"
    }
];

// Define Credit Costs
const CREDIT_COSTS = {
    basic: 1,
    premium: 2, // SEO Optimized
};


export default function YouTubeAnalyzerPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  // Optional: const { toast } = useToast();

  // --- State (Original UI state + Credit state) ---
  const [topic, setTopic] = useState('');
  const [generatedHook, setGeneratedHook] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic');
  const [niche, setNiche] = useState('technology');
  const [hookStyle, setHookStyle] = useState('question');
  const [titleStyle, setTitleStyle] = useState('howto');
  const [audienceType, setAudienceType] = useState('general');
  const [error, setError] = useState<string | null>(null);
  // const userCredits = 15; // Removed hardcoded credits

  // --- Credit State ---
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [showOutOfCreditsAlert, setShowOutOfCreditsAlert] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(CREDIT_COSTS.basic);

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
            if (status === 406 || profileError.code === "PGRST116") {
              console.error("[Client] User profile not found ID:", session.user.id);
              throw new Error("User profile not found. Please contact support.");
            } else {
              console.error("[Client] Supabase profile fetch error:", profileError);
              throw new Error(`Failed to fetch credits: ${profileError.message}`);
            }
          } else if (data && typeof data.credits === "number") {
            setCurrentCredits(data.credits);
            console.log(`[Client] Credits loaded: ${data.credits}`);
          } else {
            console.warn("[Client] Profile data missing or credits invalid.");
            throw new Error("Could not retrieve valid credit information.");
          }
        } catch (err: unknown) {
          console.error("[Client] Error fetching credits:", err);

          let message = "Could not load user credits.";
          if (err instanceof Error) {
            message = err.message;
          }

          setError(message);
          setCurrentCredits(null);

          if (message === "Not authenticated") {
            console.log("[Client] User not authenticated. Redirecting...");
            router.push("/login");
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
  }, [activeTab]);


  // --- Event Handlers ---
  const handleGenerate = async () => {
    setError(null);
    setShowOutOfCreditsAlert(false);

    if (!topic || topic.trim().length === 0) {
        setError("Please enter your Video Topic first.");
        return;
    }
    if (currentCredits === null || isLoadingCredits) {
        setError("Cannot generate: Credit information is unavailable.");
        return;
    }

    const creditsToUse = requiredCredits;

    // --- Frontend Credit Check ---
    if (currentCredits < creditsToUse) {
      console.log(`[Client] Insufficient credits. Needed: ${creditsToUse}, Available: ${currentCredits}`);
      setShowOutOfCreditsAlert(true);
      return;
    }

    // --- Start Generation Process ---
    setIsGenerating(true);
    setGeneratedHook('');
    setGeneratedTitle('');

    console.log(`[Client] Starting YT Hook/Title generation. Cost: ${creditsToUse}, Mode: ${activeTab}`);

    try {
      const response = await fetch('/api/analyzer', { // Ensure endpoint is correct
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          niche,
          hookStyle,
          titleStyle,
          audienceType,
          credits: creditsToUse, // Send required credits
          isPremium: activeTab === 'premium', // Send premium status
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
          // Handle other API errors
          const errorMessage = data.error || `API request failed with status ${response.status}`;
          setError(errorMessage);
        }
      } else {
        // --- Success ---
        console.log("[Client] Generation successful:", data);

        if (data.title && data.hook) {
            setGeneratedTitle(data.title);
            setGeneratedHook(data.hook);

            // Update Credits on successful generation
            if (typeof data.remainingCredits === 'number') {
              setCurrentCredits(data.remainingCredits);
              console.log(`[Client] Credits updated locally to: ${data.remainingCredits}`);
            } else {
              // This shouldn't happen if API is correct, but a fallback
              console.warn("[Client] API success response missing remainingCredits. Deducting locally.");
              setCurrentCredits(currentCredits - creditsToUse);
            }

        } else {
            console.warn("[Client] API response missing 'title' or 'hook'.");
            setError("Generation succeeded, but title or hook was missing from the response.");
        }
      }
    } catch (err: unknown) {
      // Handle network errors or errors processing the response before `response.json()`
      console.error('[Client] Error during generation:', err);

      let message = 'An unexpected error occurred during generation.';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);

    } finally {
      setIsGenerating(false);
      console.log("[Client] Generation process finished.");
    }
  };

  // Original handleCopy function
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // Consider adding a toast notification here if desired
  };

  const handleReset = () => {
    setTopic('');
    setGeneratedHook('');
    setGeneratedTitle('');
    setError(null);
    setShowOutOfCreditsAlert(false);
    // Reset other inputs? Optional
  };

  const handleSave = () => {
    alert('Hook and title saved to favorites!'); // Original placeholder
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-black text-white my-14 lg:my-0 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section (Original) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
              <PlayCircle className="text-red-500" />
              YouTube Hook Analyzer & Title Generator
            </h1>
            <p className="text-gray-300 text-lg">Create eye-catching hooks and titles for your YouTube videos</p>
          </div>
        </div>

        {/* --- Error & Notice Area (Added) --- */}
        {showOutOfCreditsAlert && (
            <Card className="bg-yellow-900/80 border border-yellow-700 text-yellow-100 mt-4">
                <CardHeader className='p-3'>
                   <div className='flex justify-between items-center'>
                        <CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16}/> Insufficient Credits</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowOutOfCreditsAlert(false)} className='text-yellow-100 hover:bg-yellow-800/50 h-auto p-1 rounded-full' aria-label="Close insufficient credits alert"><X size={18} /></Button>
                   </div>
                </CardHeader>
                <CardContent className='p-3 pt-0 text-sm space-y-2'>
                   <p>You need {requiredCredits} credit{requiredCredits > 1 ? 's' : ''} for {activeTab === 'premium' ? 'SEO-Optimized' : 'Basic'} generation, but only have {currentCredits ?? 0}.</p>
                   <Button asChild variant="default" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs h-8 px-3">
                      <Link href='/post-login/pricing'> {/* ** CHECK LINK ** */}
                          <CreditCard className='h-4 w-4 mr-1.5'/> Please upgrade your plan.<ExternalLink className='h-3 w-3 ml-1 opacity-70'/>
                      </Link>
                   </Button>
                </CardContent>
            </Card>
        )}
        {error && !isLoadingCredits && !showOutOfCreditsAlert && (
            <Card className="bg-red-900/80 border border-red-700 text-red-100 mt-4">
                <CardHeader className='p-3'>
                   <div className='flex justify-between items-center'>
                        <CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16}/> Error</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close error message"><X size={18}/></Button>
                   </div>
                </CardHeader>
                <CardContent className='p-3 pt-0 text-sm'>{error}</CardContent>
            </Card>
        )}
        {error && isLoadingCredits && (
             <Card className="bg-gray-800 border border-gray-700 text-gray-300 mt-4">
                  <CardHeader className='p-3'><CardTitle className='text-base flex items-center gap-2'><Info size={16}/> Notice</CardTitle></CardHeader>
                  <CardContent className='p-3 pt-0 text-sm'>{error} Could not load credit details. Please refresh or try logging in again.</CardContent>
              </Card>
        )}
        {/* --- End Error Area --- */}


        {/* Main Content Grid (Original) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Input Section (Original) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl md:text-2xl text-white">Video Configuration</CardTitle>
                <CardDescription className="text-gray-400 text-sm md:text-base">
                  Customize your YouTube hook & title
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* --- Input Fields (Original Structure) --- */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Video Topic</label>
                  <Textarea
                    placeholder="Enter your video topic or draft title (e.g., iPhone photography tips, passive income ideas)"
                    className="bg-gray-950 border-gray-700 h-24 md:h-32 text-base p-4 text-white placeholder:text-gray-500" // Original classes
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Content Niche</label>
                  <Select value={niche} onValueChange={setNiche}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {niches.map((item) => (
                        <SelectItem key={item.value} value={item.value} className="hover:bg-gray-800 text-white"> {/* Original classes */}
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Hook Style</label>
                  <ToggleGroup
                    type="single"
                    value={hookStyle}
                    onValueChange={(value) => value && setHookStyle(value)}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2" // Original classes
                  >
                    {hookStyles.map((h) => (
                      <ToggleGroupItem
                        key={h.value}
                        value={h.value}
                        className="text-xs md:text-sm data-[state=on]:bg-red-600 data-[state=on]:text-white border-gray-700 text-white" // Original classes
                      >
                        {h.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Title Style</label>
                  <Select value={titleStyle} onValueChange={setTitleStyle}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select title style" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {titleStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value} className="hover:bg-gray-800 text-white"> {/* Original classes */}
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Target Audience</label>
                  <Select value={audienceType} onValueChange={setAudienceType}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select audience" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {audienceTypes.map((audience) => (
                        <SelectItem key={audience.value} value={audience.value} className="hover:bg-gray-800 text-white"> {/* Original classes */}
                          {audience.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 {/* --- End Input Fields --- */}
              </CardContent>
              <CardFooter className="flex flex-col gap-4"> {/* Original Structure */}
                {/* --- Tabs (Original) --- */}
                <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'premium')}>
                  <TabsList className="grid grid-cols-2 w-full bg-gray-800 h-12">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-red-600 data-[state=active]:text-white h-10">
                      <div className="flex flex-col items-center">
                        <span className="text-white">Basic</span>
                        <span className="text-xs text-gray-300">({CREDIT_COSTS.basic} Credit)</span> {/* Updated cost text */}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="data-[state=active]:bg-red-600 data-[state=active]:text-white h-10"> {/* Kept red for simplicity */}
                      <div className="flex flex-col items-center">
                        <span className="text-white">SEO-Optimized</span>
                        <span className="text-xs text-gray-300">({CREDIT_COSTS.premium} Credits)</span> {/* Updated cost text */}
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* --- Credit Display (Added) --- */}
                <div className="text-center text-xs text-gray-400 w-full pt-1">
                    {isLoadingCredits ? (
                         <span className="inline-flex items-center gap-1 animate-pulse">Loading credits...</span>
                    ) : currentCredits !== null ? (
                        <span>Credits Available: <strong className="text-white font-semibold">{currentCredits}</strong></span>
                    ) : (
                        <span className="text-red-400 font-medium">Credit info unavailable</span>
                    )}
                </div>

                {/* --- Generate Button (Original Styling, Updated Disabled Logic) --- */}
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 h-12 text-base md:text-lg" // Original classes
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating || isLoadingCredits || currentCredits === null || showOutOfCreditsAlert} // Updated disabled logic
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2 text-white"> {/* Original loading */}
                      Generating<span className="loading-dots">...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-white"> {/* Original text */}
                      Generate Hook & Title <Sparkles className="h-5 w-5" />
                    </span>
                  )}
                </Button>
                 {/* Original Error display removed, now handled by top-level alerts */}
              </CardFooter>
            </Card>

            {/* Examples Section (Original) */}
            <div className="space-y-4 hidden md:block">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Star className="text-yellow-400 h-5 w-5" />
                Example Hooks & Titles
              </h2>
              <div className="space-y-4">
                {exampleHooks.map((example, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 rounded-lg"> {/* Original classes */}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-300">{example.topic}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400">Hook:</p>
                        <p className="text-sm whitespace-pre-wrap text-gray-200">{example.hook}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Title:</p>
                        <p className="text-sm whitespace-pre-wrap text-gray-200">{example.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div> {/* End Input Column */}

          {/* Output Section (Original Structure) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-900 border-gray-800 rounded-xl"> {/* Original classes */}
              <CardHeader className="flex flex-row items-center justify-between pb-4"> {/* Original classes */}
                <div className="space-y-1">
                  <CardTitle className="text-xl md:text-2xl text-white">Generated Content</CardTitle>
                  <CardDescription className="text-gray-400 text-sm md:text-base">
                    Your YouTube hook and title
                  </CardDescription>
                </div>
                {/* --- Original Action Buttons --- */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-800 text-black" // Original classes
                    onClick={handleReset}
                    disabled={isGenerating || (!generatedHook && !generatedTitle)} // Adjusted disabled slightly
                    title="Reset"
                  >
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-800 text-black" // Original classes
                    onClick={() => handleCopy(`${generatedTitle}\n\n${generatedHook}`)} // Copy all logic
                    disabled={!generatedHook || !generatedTitle || isGenerating} // Adjusted disabled
                    title="Copy All"
                  >
                    <Copy className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-800 text-black" // Original classes
                    onClick={handleSave}
                    disabled={!generatedHook || !generatedTitle || isGenerating} // Adjusted disabled
                    title="Save"
                  >
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6"> {/* Original classes */}
                 {/* Error message display removed, handled above */}

                {/* YouTube Video Preview (Original structure) */}
                {generatedTitle || generatedHook ? ( // Show if either exists
                  <div className="space-y-6">
                    {/* --- Video Player Placeholder --- */}
                    <Card className="bg-black border border-gray-800 rounded-lg overflow-hidden">
                      <div className="aspect-video bg-gray-800 flex items-center justify-center">
                        <PlayCircle className="h-16 w-16 text-red-500 opacity-80" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white text-lg md:text-xl line-clamp-2">{generatedTitle || 'Your Title Here'}</h3>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="h-8 w-8 rounded-full bg-gray-700 flex-shrink-0"></div>
                          <div className="text-sm text-gray-400 truncate">Your Channel • 1.2K views • 2 days ago</div>
                        </div>
                      </div>
                    </Card>

                    {/* --- Title and Hook Output (Original Structure) --- */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-white flex items-center gap-2"> {/* Original classes */}
                            <span>Title</span>
                            {activeTab === 'premium' && generatedTitle && ( // Show badge only if premium and title exists
                              <Badge className="bg-red-600 text-white text-xs">SEO-Optimized</Badge>
                            )}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-gray-300 hover:bg-gray-800" // Original classes
                            onClick={() => handleCopy(generatedTitle)}
                            disabled={!generatedTitle || isGenerating}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                        <Card className="bg-gray-950 border-gray-800 p-4"> {/* Original classes */}
                          <p className="text-white">{generatedTitle || <span className="italic text-gray-500">Generate a title...</span>}</p>
                        </Card>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-white">Hook for First 5 Seconds</h3> {/* Original classes */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-gray-300 hover:bg-gray-800" // Original classes
                            onClick={() => handleCopy(generatedHook)}
                             disabled={!generatedHook || isGenerating}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                        <Card className="bg-gray-950 border-gray-800 p-4"> {/* Original classes */}
                          <p className="text-white">{generatedHook || <span className="italic text-gray-500">Generate a hook...</span>}</p>
                        </Card>
                      </div>
                    </div>
                  </div>
                ) : (
                   // Original Placeholder
                  <div className="h-80 flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-700 rounded-lg">
                    <PlayCircle className="h-16 w-16 text-gray-700 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No Content Generated Yet</h3>
                    <p className="text-gray-400">Fill in your video topic and click generate to create your hook and title</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics Card (Original Structure, Placeholder Data) */}
            { (generatedTitle || generatedHook) && !isGenerating && ( // Show only if content exists and not generating
              <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden"> {/* Original classes */}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-white"> {/* Original classes */}
                    <TrendingUp className="text-red-400 h-4 w-4 md:h-5 md:w-5" />
                    Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Original classes */}
                    <div className="p-4 bg-gray-800 rounded-lg flex flex-col items-center text-center"> {/* Original classes */}
                      <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center mb-2"> {/* Original classes */}
                        <TrendingUp className="h-6 w-6 text-red-400" />
                      </div>
                      <span className="text-lg font-bold text-white">96%</span> {/* Placeholder */}
                      <span className="text-xs text-gray-400">Click-Through Rate</span> {/* Placeholder */}
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg flex flex-col items-center text-center"> {/* Original classes */}
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2"> {/* Original classes */}
                        <Target className="h-6 w-6 text-green-400" />
                      </div>
                      <span className="text-lg font-bold text-white">High</span> {/* Placeholder */}
                      <span className="text-xs text-gray-400">SEO Score</span> {/* Placeholder */}
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg flex flex-col items-center text-center"> {/* Original classes */}
                      <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-2"> {/* Original classes */}
                        <Star className="h-6 w-6 text-blue-400" />
                      </div>
                      <span className="text-lg font-bold text-white">8.7/10</span> {/* Placeholder */}
                      <span className="text-xs text-gray-400">Engagement Score</span> {/* Placeholder */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Examples Section - Mobile (Original) */}
            <div className="space-y-4 md:hidden">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Star className="text-yellow-400 h-5 w-5" />
                Example Hooks & Titles
              </h2>
              <div className="space-y-4">
                {exampleHooks.map((example, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 rounded-lg"> {/* Original classes */}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">{example.topic}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-400">Hook:</p>
                        <p className="text-xs md:text-sm whitespace-pre-wrap text-gray-200">{example.hook}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Title:</p>
                        <p className="text-xs md:text-sm whitespace-pre-wrap text-gray-200">{example.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div> {/* End Output Column */}
        </div> {/* End Main Grid */}
      </div> {/* End Max Width Container */}
    </div> // End Page Root Div
  );
};