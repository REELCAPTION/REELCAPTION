// src/app/post-login/tools/hashtag/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Copy, RotateCcw, Save, Hash, MessageSquare, Flame, Bookmark, Info, AlertTriangle, X, CreditCard, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
// Optional: import { useToast } from "@/components/ui/use-toast";
import { Database } from '@/types_db';
import Link from 'next/link';

export default function HashtagGeneratorPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  // Optional: const { toast } = useToast();

  // --- State ---
  const [topic, setTopic] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic'); // 'basic' (1 credit) or 'premium' (2 credits)
  const [category, setCategory] = useState('general');
  const [nicheTips, setNicheTips] = useState<string[]>([]); // Tips from premium generation
  const [error, setError] = useState<string | null>(null); // For general errors
  const [currentCredits, setCurrentCredits] = useState<number | null>(null); // User's current credits
  const [isLoadingCredits, setIsLoadingCredits] = useState(true); // Loading state for credits
  const [showOutOfCreditsAlert, setShowOutOfCreditsAlert] = useState(false); // Specific state for credit alert
  const [requiredCredits, setRequiredCredits] = useState(1); // Credits needed for generation

  // --- Static Configuration Data ---
  const categories = [ // Example categories, expand as needed
    { value: 'general', label: 'General' },
    { value: 'business', label: 'Business' },
    { value: 'travel', label: 'Travel' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'food', label: 'Food & Cooking' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'tech', label: 'Technology' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'art', label: 'Art & Design' },
    { value: 'education', label: 'Education' },
    { value: 'finance', label: 'Finance' },
    { value: 'health', label: 'Health & Wellness' },
    { value: 'music', label: 'Music' },
    { value: 'photography', label: 'Photography' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'sports', label: 'Sports' },
    { value: 'parenting', label: 'Parenting' },
    { value: 'pets', label: 'Pets & Animals' },
    { value: 'books', label: 'Books & Literature' },
    { value: 'nature', label: 'Nature & Environment' }
  ];



  const exampleTopics = [
    { topic: 'Coffee shop grand opening event', hashtags: ['#coffeeshop', '#grandopening', '#specialtycoffee', '#localbusiness', '#cafevibes'] },
    { topic: 'Beautiful sunset beach photography', hashtags: ['#sunset', '#beachlife', '#goldenhour', '#photography', '#oceanview'] },
    { topic: 'My daily 15-minute home workout routine', hashtags: ['#homeworkout', '#fitnessmotivation', '#quickworkout', '#healthylifestyle', '#fitathome'] }
  ];

  const hashtagTips = [
    "Mix popular (broad reach) and niche (targeted) hashtags.",
    "Aim for 10-15 relevant hashtags per post (Instagram max 30).",
    "Research trending and competitor hashtags in your specific field.",
    "Create a unique branded hashtag for campaigns or your business.",
    "Analyze post insights to see which hashtags drive engagement.",
    "Avoid overly generic (#love) or potentially banned hashtags.",
    "Place hashtags in the caption or the first comment.",
    "Keep your hashtag list updated and relevant to the content."
  ];

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
               console.error("[Client] User profile not found for ID:", session.user.id);
               throw new Error('User profile not found. Please contact support.');
           } else {
               console.error("[Client] Supabase profile fetch error:", profileError);
               throw new Error(`Failed to fetch credits: ${profileError.message}`);
           }
        } else if (data && typeof data.credits === 'number') {
            setCurrentCredits(data.credits);
            console.log(`[Client] Credits loaded: ${data.credits}`);
        } else {
             console.warn("[Client] Profile data missing or credits field invalid.");
             throw new Error('Could not retrieve valid credit information.');
        }
      } catch (err: unknown) { // Changed from any to unknown
        console.error("[Client] Error fetching credits:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred while loading credits.'; // Safely access message
        setError(message);
        setCurrentCredits(null);
         if (message.includes('Not authenticated')) { // Check for specific message
             console.log("[Client] User not authenticated. Redirecting...");
             // Optional: Show toast before redirect
             router.push('/login'); // Redirect to login page
         }
      } finally {
        setIsLoadingCredits(false);
      }
    };
    fetchCredits();
  }, [supabase, router]); // Added supabase and router to dependency array

  // Update required credits when tab changes
  useEffect(() => {
    setRequiredCredits(activeTab === 'basic' ? 1 : 2);
  }, [activeTab]);

  // --- Event Handlers ---
  const handleToggleHashtag = (hashtag: string) => {
    setSelectedHashtags(prev =>
      prev.includes(hashtag) ? prev.filter(h => h !== hashtag) : [...prev, hashtag]
    );
  };

  const handleGenerate = async () => {
    setError(null);
    setShowOutOfCreditsAlert(false);

    if (!topic || topic.trim().length === 0) {
        setError("Please enter a topic, keywords, or caption first.");
        // toast({ variant: "destructive", title: "Input Missing" });
        return;
    };
    if (currentCredits === null || isLoadingCredits) {
        setError("Cannot generate: Credit information is unavailable or still loading.");
        // toast({ variant: "destructive", title: "Loading..." });
        return;
    }

    const creditsToUse = requiredCredits;

    // --- Frontend Credit Check ---
    if (currentCredits < creditsToUse) {
      console.log(`[Client] Insufficient credits detected. Needed: ${creditsToUse}, Available: ${currentCredits}`);
      setShowOutOfCreditsAlert(true); // Show the dedicated alert
      // toast({ variant: "destructive", title: "Insufficient Credits" });
      return; // Stop generation
    }

    // --- Start Generation Process ---
    setIsGenerating(true);
    setGeneratedHashtags([]); // Clear previous results
    setSelectedHashtags([]);
    setNicheTips([]);

    console.log(`[Client] Starting hashtag generation. Cost: ${creditsToUse} credit(s). Mode: ${activeTab}`);

    try {
      const response = await fetch('/api/hashtag', { // Ensure '/api/hashtag' is your correct endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          credits: creditsToUse, // Send required credits
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Client] API Error (${response.status}):`, data);
        if (response.status === 402 && data.errorCode === 'INSUFFICIENT_CREDITS') {
          // Backend confirms insufficient credits
          setShowOutOfCreditsAlert(true);
          // Update local count if backend provides it (more accurate)
          if (typeof data.currentCredits === 'number') {
              setCurrentCredits(data.currentCredits);
              console.log(`[Client] Insufficient credits confirmed by API. Updated local count to: ${data.currentCredits}`);
          } else {
               console.warn("[Client] Insufficient credits error from API, but no current credit count provided.");
          }
        } else if (response.status === 401 && data.errorCode === 'AUTH_REQUIRED') { // Example auth error code
            setError('Authentication error. Please log in again.');
            router.push('/login');
        } else if (['PROFILE_NOT_FOUND', 'DB_ERROR'].includes(data.errorCode)) { // Example backend error codes
             setError(`Server error (${data.errorCode}): ${data.error}. Please try again or contact support.`);
        } else if (data.errorCode === 'GENERATION_FAILED') { // Example generation error code
             setError(`Hashtag generation failed: ${data.error}. Please try adjusting your input.`);
        }
        else {
          // Use detailed error from API if available, otherwise generic message
          throw new Error(data.error || `API request failed with status ${response.status}`);
        }
      } else {
        // --- Success ---
        console.log("[Client] Generation successful. API Response:", data);
        if (data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) {
            setGeneratedHashtags(data.hashtags);
            setSelectedHashtags(data.hashtags); // Auto-select all initially
        } else {
            console.warn("[Client] API response missing 'hashtags' array or array is empty.");
            setGeneratedHashtags([]);
            setSelectedHashtags([]);
            // Maybe set a specific notice? setError("AI couldn't generate hashtags for this topic. Try rephrasing.")
        }

        if (activeTab === 'premium' && data.nicheTips && Array.isArray(data.nicheTips)) {
          setNicheTips(data.nicheTips);
        } else {
          setNicheTips([]);
        }

        // Update local credit count from API response (most reliable way)
        if (typeof data.remainingCredits === 'number') {
            setCurrentCredits(data.remainingCredits);
             console.log(`[Client] Credits updated locally to: ${data.remainingCredits}`);
             // toast({ title: "Hashtags Generated!", description: `Used ${creditsToUse} credit(s).` });
        } else {
            console.warn("[Client] API success response missing remainingCredits. Deducting locally (less reliable).");
             if (currentCredits !== null) { // Only deduct if we had a credit count
                setCurrentCredits(currentCredits - creditsToUse); // Fallback deduction
             }
            // toast({ title: "Hashtags Generated!", description: `Used ${creditsToUse} credit(s). (Local fallback)` });
        }
      }
    } catch (err: unknown) { // Changed from any to unknown
      console.error('[Client] Error in handleGenerate fetch/processing:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during generation.'; // Safely access message
      if (!showOutOfCreditsAlert) { // Don't overwrite OOC alert with generic error
         setError(message);
      }
      // toast({ variant: "destructive", title: "Generation Failed", description: err.message });
      // Clear results on error to avoid confusion
      setGeneratedHashtags([]);
      setSelectedHashtags([]);
      setNicheTips([]);
    } finally {
      setIsGenerating(false);
      console.log("[Client] Generation process finished.");
    }
  };

  const handleCopy = () => {
    if (!selectedHashtags.length) return;
    navigator.clipboard.writeText(selectedHashtags.join(' '))
      .then(() => {
          console.log("[Client] Hashtags copied.");
          // toast({ title: "Copied!", description: `${selectedHashtags.length} hashtags copied to clipboard.` });
          // Consider adding visual feedback e.g., change Copy icon briefly
      })
      .catch(err => {
           console.error("[Client] Copy failed:", err);
           // Provide a user-friendly error message if possible
           let errorMessage = "Failed to copy hashtags to clipboard.";
            if (err instanceof Error) {
                errorMessage += ` ${err.message}`;
            }
           setError(errorMessage);
           // toast({ variant: "destructive", title: "Copy Failed" });
      });
  };

  const handleReset = () => {
    setTopic('');
    setGeneratedHashtags([]);
    setSelectedHashtags([]);
    setNicheTips([]);
    setError(null);
    setShowOutOfCreditsAlert(false);
    // Reset category and tab? Optional, depends on desired UX
    // setCategory('general');
    // setActiveTab('basic');
    console.log("[Client] Form reset.");
    // toast({ title: "Form Reset" });
  };

  const handleSave = () => { // Placeholder Functionality
     if (!selectedHashtags.length) return;
     console.log("[Client] Attempting to save hashtags (placeholder):", selectedHashtags);
     // Replace alert with toast or actual save logic when implemented
     alert('Save functionality is not yet implemented.');
     // toast({ title: "Save Clicked", description: "Save functionality coming soon!" });
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-black text-white my-14 lg:my-0 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2.5"> {/* Increased gap */}
              <Hash className="text-blue-400 h-7 w-7" /> {/* Slightly larger icon */}
              AI Hashtag Generator
            </h1>
            <p className="text-gray-300 text-lg">Find relevant hashtags to boost your social reach</p>
          </div>
        </div>

        {/* --- Error & Notice Area --- */}
        {/* 1. Out of Credits Alert - MATCHING TWEET GENERATOR STYLE */}
        {showOutOfCreditsAlert && (
            <Card className="bg-yellow-900/80 border border-yellow-700 text-yellow-100 mt-4">
                <CardHeader className='p-3'>
                   <div className='flex justify-between items-center'>
                        <CardTitle className='text-base flex items-center gap-2'>
                           <AlertTriangle size={16}/> Insufficient Credits
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowOutOfCreditsAlert(false)} className='text-yellow-100 hover:bg-yellow-800/50 h-auto p-1 rounded-full' aria-label="Close insufficient credits alert">
                          <X size={18} />
                        </Button>
                   </div>
                </CardHeader>
                <CardContent className='p-3 pt-0 text-sm space-y-2'>
                   {/* Exact message structure */}
                   <p>
                     You have run out of credits for this action.
                     You need {requiredCredits} credit{requiredCredits > 1 ? 's' : ''} ({activeTab === 'basic' ? 'Standard' : 'Advanced'} mode) but only have {currentCredits ?? 0}.
                   </p>
                   <Button
                       asChild // Use asChild for Link integration
                       variant="default"
                       size="sm"
                       className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs h-8 px-3"
                   >
                      <Link href='/post-login/pricing'> {/* ** CHECK THIS LINK ** */}
                          <CreditCard className='h-4 w-4 mr-1.5'/> Please upgrade your plan.
                          <ExternalLink className='h-3 w-3 ml-1 opacity-70'/>
                      </Link>
                   </Button>
                </CardContent>
            </Card>
        )}

        {/* 2. General Errors (Not related to credits or initial load) */}
        {error && !isLoadingCredits && !showOutOfCreditsAlert && (
            <Card className="bg-red-900/80 border border-red-700 text-red-100 mt-4">
                <CardHeader className='p-3'>
                   <div className='flex justify-between items-center'>
                        <CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16}/> Error</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close error message">
                          <X size={18}/>
                        </Button>
                   </div>
                </CardHeader>
                <CardContent className='p-3 pt-0 text-sm'>{error}</CardContent>
            </Card>
        )}

        {/* 3. Initial Credit Loading Error */}
        {error && isLoadingCredits && ( // Only show loading error if credits are actively loading
             <Card className="bg-gray-800 border border-gray-700 text-gray-300 mt-4">
                  <CardHeader className='p-3'><CardTitle className='text-base flex items-center gap-2'><Info size={16}/> Notice</CardTitle></CardHeader>
                  <CardContent className='p-3 pt-0 text-sm'>{error} Could not load credit details. Please refresh or try logging in again.</CardContent>
              </Card>
        )}
        {/* --- End Error Area --- */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* Input Section (Column 1) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden"> {/* Added overflow-hidden */}
              <CardHeader className="pb-4"> {/* Increased padding bottom */}
                <CardTitle className="text-xl md:text-2xl text-white">Hashtag Configuration</CardTitle>
                <CardDescription className="text-gray-400 text-sm md:text-base pt-1">
                  Enter details to generate relevant hashtags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5"> {/* Consistent padding */}
                {/* Topic Input */}
                <div className="space-y-2">
                  <label htmlFor='topic-textarea-hashtag' className="text-sm font-medium text-gray-300 flex items-center gap-1.5">Topic / Keywords / Caption <span className="text-red-400">*</span></label>
                  <Textarea
                    id='topic-textarea-hashtag'
                    placeholder="e.g., 'sustainable fashion tips', 'new coffee blend launch', 'my travel photo from Japan'"
                    className="bg-gray-950 border-gray-700 h-32 md:h-36 text-base p-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md resize-none" // Increased height, focus ring
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={350} // Slightly more length
                    required
                    aria-required="true"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Primary Content Category</label>
                  <ToggleGroup
                    type="single"
                    value={category}
                    onValueChange={(value) => value && setCategory(value)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {categories.slice(0, 6).map((cat) => ( // Show first 6 popular ones
                      <ToggleGroupItem
                        key={cat.value}
                        value={cat.value}
                        className="text-xs md:text-[13px] data-[state=on]:bg-blue-600 data-[state=on]:text-white border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md h-9 px-2" // Adjusted padding/size
                        title={cat.label} // Tooltip for full name if truncated
                      >
                        {cat.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* More Categories Dropdown */}
                <div className="space-y-2">
                  <label htmlFor="category-select" className="text-sm font-medium text-gray-300">Refine Category (Optional)</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full">
                      <SelectValue placeholder="Select or search category..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60"> {/* Slightly smaller max height */}
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-5 px-5 pb-5 border-t border-gray-800 bg-gray-900/50"> {/* Footer background */}
                {/* Credit Selection Tabs */}
                <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'premium')}>
                  <TabsList className="grid grid-cols-2 w-full bg-gray-800 h-12 rounded-md p-1"> {/* Added padding */}
                    <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm"> {/* Full height, smaller text */}
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-medium">Standard</span>
                        <span className="text-[11px] text-gray-400 data-[state=active]:text-blue-100">(1 Credit)</span> {/* Smaller credit text */}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm"> {/* Full height, smaller text */}
                       <div className="flex flex-col items-center justify-center">
                        <span className="font-medium">Advanced ✨</span>
                        <span className="text-[11px] text-gray-400 data-[state=active]:text-purple-100">(2 Credits)</span> {/* Smaller credit text */}
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Credit Display */}
                <div className="text-center text-xs text-gray-400 w-full pt-1"> {/* Smaller text, padding top */}
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
                  type="button" // Explicitly type button
                  className={`w-full h-11 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg ${ // Added shadow
                    activeTab === 'basic'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                  }`}
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating || isLoadingCredits || currentCredits === null || showOutOfCreditsAlert} // Trim topic check
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Hashtags <Sparkles className="h-5 w-5 ml-1.5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Examples Section (Desktop) */}
             <Card className="hidden md:block bg-gray-900 border-gray-800 rounded-xl shadow-lg p-4">
                 <CardHeader className="p-0 pb-3">
                     <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5" /> Example Topics</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0 space-y-3">
                     {exampleTopics.map((ex, i) => (
                         <button
                             key={i}
                             onClick={() => setTopic(ex.topic)}
                             className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700/80 rounded-md text-sm text-gray-300 transition-colors duration-150 group"
                             title={`Use topic: ${ex.topic}`}
                         >
                             <span className="font-medium text-gray-100 group-hover:text-white block mb-1.5">&quot;{ex.topic}&quot;</span>
                             <div className="flex flex-wrap gap-1.5">
                                {ex.hashtags.slice(0,4).map((tag, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 group-hover:bg-gray-600 text-gray-400 group-hover:text-gray-200 px-1.5 py-0.5 font-normal">{tag}</Badge>)}
                                 {ex.hashtags.length > 4 && <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 font-normal">...</Badge>}
                             </div>
                         </button>
                     ))}
                 </CardContent>
             </Card>

          </div> {/* End Input Column */}

          {/* Output Section (Column 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Suggested Hashtags Card */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 px-5 pt-5"> {/* Consistent padding */}
                <div className="space-y-1">
                  <CardTitle className="text-xl md:text-2xl text-white">Generated Hashtags</CardTitle>
                  <CardDescription className="text-gray-400 text-sm md:text-base">
                    Click hashtags below to select/deselect
                  </CardDescription>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleReset} disabled={isGenerating} title="Reset Form & Output">
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleCopy} disabled={!selectedHashtags.length || isGenerating} title="Copy Selected Hashtags">
                    <Copy className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleSave} disabled={!selectedHashtags.length || isGenerating} title="Save Selected (Coming Soon)">
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {/* Hashtag Preview Box */}
                <div className="bg-black rounded-xl p-4 md:p-6 min-h-[18rem] md:min-h-[20rem] border border-gray-700 flex flex-col shadow-inner relative"> {/* Added relative */}
                  {isGenerating ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8 bg-black/50 backdrop-blur-sm z-10 rounded-xl"> {/* Loading overlay */}
                          <Hash className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-blue-500 animate-pulse" />
                          <p className="text-lg text-white font-medium animate-pulse">Generating Hashtags...</p>
                          <p className="text-sm text-gray-400 animate-pulse">Please wait a moment.</p>
                     </div>
                  ) : generatedHashtags.length > 0 ? (
                    <div className="flex-grow flex flex-col justify-between">
                      {/* Hashtag List */}
                      <div className="flex flex-wrap gap-2 md:gap-2.5"> {/* Slightly adjusted gap */}
                        {generatedHashtags.map((hashtag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className={`text-sm md:text-[15px] py-1 px-3 cursor-pointer transition-all duration-150 ease-in-out rounded-full border ${ // Adjusted padding/size
                              selectedHashtags.includes(hashtag)
                                ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 font-medium shadow-sm' // Added font-medium/shadow
                                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 hover:text-gray-100'
                            }`}
                            onClick={() => handleToggleHashtag(hashtag)}
                          >
                            {hashtag}
                          </Badge>
                        ))}
                      </div>
                      {/* Selection Info Footer */}
                      <div className="pt-4 mt-6 border-t border-gray-800/80 flex items-center justify-between text-sm"> {/* Lighter border */}
                           <div className="flex items-center gap-2 text-gray-400">
                             <Bookmark className={`h-4 w-4 transition-colors ${selectedHashtags.length > 0 ? 'text-blue-400' : 'text-gray-600'}`} />
                             <span>Selected: <strong className="text-white font-semibold">{selectedHashtags.length}</strong></span>
                           </div>
                           <span className={`text-xs font-medium ${selectedHashtags.length > 30 ? 'text-red-400' : 'text-gray-500'}`}>
                                {selectedHashtags.length > 30 ? `(${selectedHashtags.length - 30} over limit!)` : `Max ~30 recommended`}
                           </span>
                        </div>
                    </div>
                  ) : (
                     // Enhanced Initial Placeholder State
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-600 text-center p-4 md:p-8">
                      <Hash className="h-12 w-12 md:h-16 md:w-16 mb-5 text-gray-700 opacity-80" />
                      <p className="text-lg md:text-xl mb-2 text-gray-400 font-medium">Hashtag suggestions will load here</p>
                      <p className="text-gray-500 text-sm md:text-base max-w-xs mx-auto">Enter your topic/keywords above and click the &quot;Generate Hashtags&quot; button.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Niche Hashtag Tips (Premium Only) */}
            {!isGenerating && activeTab === 'premium' && nicheTips.length > 0 && (
              <Card className="bg-gradient-to-br from-purple-900/40 via-gray-900/80 to-gray-900 border border-purple-800/60 rounded-xl shadow-lg">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-purple-300">
                    <Flame className="text-orange-400 h-5 w-5" />
                    Advanced Insights (Premium)
                  </CardTitle>
                     <CardDescription className="text-purple-400/80 text-sm pt-1">Specific recommendations based on your input:</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <ul className="space-y-2.5 list-disc list-inside pl-2">
                    {nicheTips.map((tip, index) => (
                       <li key={index} className="text-gray-300 text-sm leading-snug">{tip}</li> // Tighter leading
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* General Hashtag Strategy Tips */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-white">
                  <MessageSquare className="text-blue-400 h-5 w-5" />
                  General Hashtag Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {hashtagTips.slice(0, 6).map((tip, index) => ( // Show maybe 6 tips max
                    <div key={index} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0"></span> {/* Smaller dot */}
                      <p className="text-gray-300 text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Examples Section (Mobile) - Consolidated into one block */}
            <Card className="md:hidden bg-gray-900 border-gray-800 rounded-xl shadow-lg p-4">
                <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5" /> Example Topics</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                    {exampleTopics.map((ex, i) => (
                        <button
                            key={i}
                            onClick={() => setTopic(ex.topic)}
                            className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700/80 rounded-md text-sm text-gray-300 transition-colors duration-150 group"
                            title={`Use topic: ${ex.topic}`}
                        >
                            <span className="font-medium text-gray-100 group-hover:text-white block mb-1.5">&quot;{ex.topic}&quot;</span>
                            <div className="flex flex-wrap gap-1.5">
                               {ex.hashtags.slice(0,4).map((tag, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 group-hover:bg-gray-600 text-gray-400 group-hover:text-gray-200 px-1.5 py-0.5 font-normal">{tag}</Badge>)}
                                {ex.hashtags.length > 4 && <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 font-normal">...</Badge>}
                            </div>
                        </button>
                    ))}
                </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}