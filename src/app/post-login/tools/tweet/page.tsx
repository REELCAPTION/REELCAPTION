// src/app/post-login/tools/tweet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge'; // Although not used for output, keep for consistency if needed elsewhere
import { Sparkles, Copy, RotateCcw, Twitter, Languages, MessageSquare, MousePointerClick, Info, AlertTriangle, X, CreditCard, ExternalLink, Star } from 'lucide-react'; // Added necessary icons
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
// Optional: import { useToast } from "@/components/ui/use-toast";
import { Database } from '@/types_db';
import Link from 'next/link';

// --- Types matching the API ---
type Tone = 'professional' | 'funny' | 'motivational' | 'sarcastic' | 'inspirational';
type TweetType = 'short tweet' | 'story-style' | 'thread starter' | 'quote tweet' | 'question-based';
type Cta = 'none' | 'follow me for more' | 'retweet if you agree' | 'comment your thoughts below';
type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'ta';

export default function TweetGeneratorPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  // Optional: const { toast } = useToast();

  // --- State ---
  const [topic, setTopic] = useState('');
  const [generatedTweet, setGeneratedTweet] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]); // Keep state for potential future use or if API provides them
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic');
  const [tone, setTone] = useState<Tone>('professional');
  const [tweetType, setTweetType] = useState<TweetType>('short tweet');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [cta, setCta] = useState<Cta>('none');
  const [useEmojis, setUseEmojis] = useState(true);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutOfCreditsAlert, setShowOutOfCreditsAlert] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(1);

  // --- Configuration Data ---
  const tonesConfig: { value: Tone; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'funny', label: 'Funny' },
    { value: 'motivational', label: 'Motivational' },
    { value: 'sarcastic', label: 'Sarcastic' },
    { value: 'inspirational', label: 'Inspirational' }
  ];

  const tweetTypesConfig: { value: TweetType; label: string }[] = [
    { value: 'short tweet', label: 'Short Tweet' },
    { value: 'story-style', label: 'Story-style' },
    { value: 'thread starter', label: 'Thread Starter' },
    { value: 'quote tweet', label: 'Quote Tweet' },
    { value: 'question-based', label: 'Question-based' }
  ];

  const languagesConfig: { value: LanguageCode; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ta', label: 'Tamil' },
  ];

  const ctasConfig: { value: Cta; label: string }[] = [
    { value: 'none', label: 'No CTA' },
    { value: 'follow me for more', label: 'Follow me for more!' },
    { value: 'retweet if you agree', label: 'Retweet if you agree!' },
    { value: 'comment your thoughts below', label: 'Comment your thoughts!' } // Shortened for button fit
  ];

  const exampleTweets = [
    {
      topic: 'Productivity tips for remote workers',
      hashtags: ['#productivity', '#remotework', '#wfh', '#worksmart']
    },
    {
      topic: 'Excited about the future of AI assistants',
       hashtags: ['#AI', '#FutureTech', '#ArtificialIntelligence', '#Innovation']
    },
    {
        topic: 'Just launched my new SaaS product!',
        hashtags: ['#SaaS', '#productlaunch', '#startup', '#tech']
    }
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
        // Safely access error message
        const message = err instanceof Error ? err.message : 'An unknown error occurred fetching credits.';
        setError(message);
        setCurrentCredits(null);
         if (message === 'Not authenticated') {
             console.log("[Client] User not authenticated. Redirecting...");
             router.push('/login');
         }
      } finally {
        setIsLoadingCredits(false);
      }
    };
    fetchCredits();
  }, [supabase, router]);

  // Update required credits when tab changes
  useEffect(() => {
    setRequiredCredits(activeTab === 'basic' ? 1 : 2);
  }, [activeTab]);

  // --- Generate Handler ---
  const handleGenerate = async () => {
    setError(null);
    setShowOutOfCreditsAlert(false);

    if (!topic || topic.trim().length === 0) {
        setError("Please enter a topic for your tweet first.");
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
      setShowOutOfCreditsAlert(true);
      return;
    }

    // --- Start Generation Process ---
    setIsGenerating(true);
    setGeneratedTweet('');
    setHashtags([]); // Clear potential hashtags from previous runs

    console.log(`[Client] Starting tweet generation. Cost: ${creditsToUse} credit(s). Mode: ${activeTab}`);

    try {
      const response = await fetch('/api/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          tone,
          tweetType,
          language,
          cta,
          useEmojis,
          credits: creditsToUse,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Client] API Error (${response.status}):`, data);
        if (response.status === 402 && data.errorCode === 'INSUFFICIENT_CREDITS') {
          setShowOutOfCreditsAlert(true);
          if (typeof data.currentCredits === 'number') {
              setCurrentCredits(data.currentCredits);
              console.log(`[Client] Insufficient credits confirmed by API. Updated local count to: ${data.currentCredits}`);
          } else {
               console.warn("[Client] Insufficient credits error from API, but no current credit count provided.");
          }
        } else if (response.status === 401 && data.errorCode === 'AUTH_REQUIRED') {
            setError('Authentication error. Please log in again.');
            router.push('/login');
        } else if (['PROFILE_NOT_FOUND', 'DB_ERROR', 'PROFILE_DATA_MISSING', 'DB_FETCH_ERROR', 'DB_UPDATE_ERROR'].includes(data.errorCode)) {
             setError(`Server error (${data.errorCode}): ${data.error}. Please try again or contact support.`);
        } else if (data.errorCode === 'COHERE_API_ERROR' || data.errorCode === 'GENERATION_EMPTY') {
            setError(`AI generation failed: ${data.error}. ${data.details || 'Please try adjusting your input.'}`);
        } else {
          throw new Error(data.error || `API request failed with status ${response.status}`);
        }
      } else {
        // --- Success ---
        console.log("[Client] Generation successful. API Response:", data);
        if (data.tweet) {
            setGeneratedTweet(data.tweet);
        } else {
             console.warn("[Client] API response missing 'tweet'.");
             setError("AI couldn't generate a tweet for this topic. Try rephrasing.");
        }
        setHashtags(data.hashtags || []); // Store hashtags if provided

        if (typeof data.remainingCredits === 'number') {
            setCurrentCredits(data.remainingCredits);
             console.log(`[Client] Credits updated locally to: ${data.remainingCredits}`);
             // toast({ title: "Tweet Generated!", description: `Used ${creditsToUse} credit(s).` });
        } else {
            console.warn("[Client] API success response missing remainingCredits. Deducting locally (less reliable).");
            setCurrentCredits(currentCredits - creditsToUse);
            // toast({ title: "Tweet Generated!", description: `Used ${creditsToUse} credit(s). (Local fallback)` });
        }
      }
    } catch (err: unknown) { // Changed from any to unknown
      console.error('[Client] Error in handleGenerate fetch/processing:', err);
       // Safely access error message
       const message = err instanceof Error ? err.message : 'An unexpected error occurred during generation.';
      if (!showOutOfCreditsAlert) {
         setError(message);
      }
      // toast({ variant: "destructive", title: "Generation Failed", description: err.message });
      setGeneratedTweet('');
      setHashtags([]);
    } finally {
      setIsGenerating(false);
      console.log("[Client] Generation process finished.");
    }
  };

  // --- Other Handlers ---
   const handleCopy = () => {
        if (!generatedTweet) return;
        navigator.clipboard.writeText(generatedTweet)
        .then(() => {
            console.log("[Client] Tweet copied.");
            // toast({ title: "Copied!", description: "Tweet copied to clipboard." });
        })
        .catch(err => {
            console.error("[Client] Copy failed:", err);
            // Safely access error message
            const message = err instanceof Error ? err.message : 'An unexpected error occurred while copying.';
            setError("Failed to copy text to clipboard: " + message); // Added message for clarity
            // toast({ variant: "destructive", title: "Copy Failed" });
        });
    };

    const handleReset = () => {
        setTopic('');
        setGeneratedTweet('');
        setHashtags([]);
        setError(null);
        setShowOutOfCreditsAlert(false);
        // setTone('professional'); // Optional: Reset options
        // setTweetType('short tweet');
        // setLanguage('en');
        // setCta('none');
        // setUseEmojis(true);
        // setActiveTab('basic');
        console.log("[Client] Form reset.");
        // toast({ title: "Form Reset" });
    };

    // Placeholder - Keep or remove based on future plans
    // const handleSave = () => {
    //     if (!generatedTweet) return;
    //     console.log("[Client] Saving tweet (placeholder):", generatedTweet);
    //     alert('Save functionality is not implemented yet.');
    //     // toast({ title: "Save Clicked", description: "Save not implemented." });
    // };

     // --- Render ---
  return (
    <div className="min-h-screen bg-black text-white my-14 lg:my-0 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2.5"> {/* Increased gap */}
              <Twitter className="text-blue-400 h-7 w-7" /> {/* Slightly larger icon */}
              AI Tweet Generator
            </h1>
            <p className="text-gray-300 text-lg">Craft engaging tweets instantly with AI</p>
          </div>
        </div>

        {/* --- Error & Notice Area --- */}
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
                   <p>
                     You have run out of credits for this action.
                     You need {requiredCredits} credit{requiredCredits > 1 ? 's' : ''} ({activeTab === 'basic' ? 'Basic' : 'Premium'} mode) but only have {currentCredits ?? 0}.
                   </p>
                   <Button
                       asChild
                       variant="default"
                       size="sm"
                       className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs h-8 px-3"
                   >
                      <Link href='/post-login/pricing'> {/* ** CHECK THIS LINK IS CORRECT ** */}
                          <CreditCard className='h-4 w-4 mr-1.5'/> Please upgrade your plan.
                          <ExternalLink className='h-3 w-3 ml-1 opacity-70'/>
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
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close error message">
                          <X size={18}/>
                        </Button>
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* Input Section (Column 1) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl md:text-2xl text-white">Tweet Configuration</CardTitle>
                <CardDescription className="text-gray-400 text-sm md:text-base pt-1">
                  Enter details and customize your tweet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5">
                {/* Topic Input */}
                <div className="space-y-2">
                  <label htmlFor='topic-textarea-tweet' className="text-sm font-medium text-gray-300 flex items-center gap-1.5">Tweet Topic / Idea <span className="text-red-400">*</span></label>
                  <Textarea
                    id='topic-textarea-tweet'
                    placeholder="e.g., 'Benefits of morning walks', 'AI impact on creative jobs', 'Sharing my latest blog post about Next.js'"
                    className="bg-gray-950 border-gray-700 h-32 md:h-36 text-base p-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md resize-none"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={250} // Adjusted max length slightly
                    required
                    aria-required="true"
                  />
                </div>

                {/* Tone Selection */}
                <div className="space-y-2">
                   <label className="text-sm font-medium text-gray-300">Tone</label>
                   <ToggleGroup
                     type="single"
                     value={tone}
                     onValueChange={(value) => value && setTone(value as Tone)}
                     className="grid grid-cols-3 gap-2"
                   >
                     {tonesConfig.map((t) => (
                       <ToggleGroupItem
                         key={t.value}
                         value={t.value}
                         className="text-xs md:text-[13px] data-[state=on]:bg-blue-600 data-[state=on]:text-white border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md h-9 px-2" // Consistent style
                         title={t.label}
                       >
                         {t.label}
                       </ToggleGroupItem>
                     ))}
                   </ToggleGroup>
                </div>

                {/* Tweet Type & Language (Combined Row for Space) */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Tweet Type Selection */}
                    <div className="space-y-2">
                      <label htmlFor="tweet-type-select" className="text-sm font-medium text-gray-300">Tweet Type</label>
                      <Select value={tweetType} onValueChange={(value) => setTweetType(value as TweetType)}>
                        <SelectTrigger id="tweet-type-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">
                          {tweetTypesConfig.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Language Selection */}
                    <div className="space-y-2">
                      <label htmlFor="language-select" className="text-sm font-medium text-gray-300">Language</label>
                      <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
                        <SelectTrigger id="language-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full text-sm">
                           <div className="flex items-center gap-1.5">
                            <Languages className="h-3.5 w-3.5 text-gray-400" />
                            <SelectValue placeholder="Select lang" />
                           </div>
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">
                          {languagesConfig.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                {/* CTA Selection */}
                 <div className="space-y-2">
                   <label htmlFor="cta-select" className="text-sm font-medium text-gray-300">Call to Action (Optional)</label>
                   <Select value={cta} onValueChange={(value) => setCta(value as Cta)}>
                     <SelectTrigger id="cta-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full text-sm">
                       <div className="flex items-center gap-1.5">
                         <MousePointerClick className="h-3.5 w-3.5 text-gray-400" />
                         <SelectValue placeholder="Select CTA" />
                       </div>
                     </SelectTrigger>
                     <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">
                       {ctasConfig.map((item) => (
                         <SelectItem key={item.value} value={item.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">
                           {item.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                {/* Enhancements (Emojis) */}
                 <div className="flex items-center justify-start pt-1"> {/* Align left */}
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="emojis-checkbox"
                       checked={useEmojis}
                       onChange={(e) => setUseEmojis(e.target.checked)}
                       className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-600 cursor-pointer accent-blue-500" // Added accent color
                     />
                     <label htmlFor="emojis-checkbox" className="text-sm text-gray-300 cursor-pointer select-none">Include relevant emojis</label>
                   </div>
                 </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-5 px-5 pb-5 border-t border-gray-800 bg-gray-900/50">
                 {/* Credit Selection Tabs */}
                <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'premium')}>
                  <TabsList className="grid grid-cols-2 w-full bg-gray-800 h-12 rounded-md p-1">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-medium">Basic</span>
                        <span className="text-[11px] text-gray-400 data-[state=active]:text-blue-100">(1 Credit)</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm">
                       <div className="flex flex-col items-center justify-center">
                        <span className="font-medium">Premium ✨</span>
                        <span className="text-[11px] text-gray-400 data-[state=active]:text-purple-100">(2 Credits)</span>
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
                  className={`w-full h-11 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg ${
                    activeTab === 'basic'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                  }`}
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating || isLoadingCredits || currentCredits === null || showOutOfCreditsAlert}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Tweet <Sparkles className="h-5 w-5 ml-1.5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

             {/* Examples Section (Desktop - Input Column) */}
             <Card className="hidden md:block bg-gray-900 border-gray-800 rounded-xl shadow-lg p-4">
                 <CardHeader className="p-0 pb-3">
                     <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5" /> Example Topics</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0 space-y-3">
                     {exampleTweets.map((ex, i) => (
                         <button
                             key={i}
                             onClick={() => setTopic(ex.topic)}
                             className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700/80 rounded-md text-sm text-gray-300 transition-colors duration-150 group"
                             title={`Use topic: ${ex.topic}`}
                         >
                             <span className="font-medium text-gray-100 group-hover:text-white block mb-1.5">&quot;{ex.topic}&quot;</span>
                              <div className="flex flex-wrap gap-1.5">
                                {ex.hashtags?.slice(0,4).map((tag, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 group-hover:bg-gray-600 text-gray-400 group-hover:text-gray-200 px-1.5 py-0.5 font-normal">{tag}</Badge>)}
                                 {ex.hashtags && ex.hashtags.length > 4 && <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 font-normal">...</Badge>}
                             </div>
                         </button>
                     ))}
                 </CardContent>
             </Card>

          </div> {/* End Input Column */}


          {/* Output Section (Column 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tweet Preview Card */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 px-5 pt-5">
                <div className="space-y-1">
                  <CardTitle className="text-xl md:text-2xl text-white">Tweet Preview</CardTitle>
                  <CardDescription className="text-gray-400 text-sm md:text-base">
                    Your AI-generated tweet draft
                  </CardDescription>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    onClick={handleReset}
                    disabled={isGenerating}
                    title="Reset Form & Output"
                  >
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    onClick={handleCopy}
                    disabled={!generatedTweet || isGenerating}
                    title="Copy Tweet Text"
                  >
                    <Copy className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                   {/* Optional Save Button - Keep commented out unless implemented
                   <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleSave} disabled={!generatedTweet || isGenerating} title="Save Tweet (Coming Soon)">
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  */}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {/* Twitter-like Preview Box */}
                <div className="bg-black rounded-xl p-4 md:p-6 min-h-[18rem] md:min-h-[20rem] border border-gray-700 flex flex-col shadow-inner relative">
                  {isGenerating ? (
                     // Use the Twitter Icon pulse animation for thematic consistency
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8 bg-black/50 backdrop-blur-sm z-10 rounded-xl">
                          <Twitter className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-blue-500 animate-pulse" />
                          <p className="text-lg text-white font-medium animate-pulse">Generating Tweet...</p>
                          <p className="text-sm text-gray-400 animate-pulse">Crafting the perfect words...</p>
                     </div>
                  ) : generatedTweet ? (
                    <div className="flex-grow flex flex-col justify-between h-full">
                      {/* Tweet Content Area */}
                      <div className="flex items-start gap-3">
                         {/* Placeholder Avatar */}
                        <div className="mt-1 h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex-shrink-0 animate-pulse shadow"></div>
                        <div className='flex-1 min-w-0'> {/* Ensure text wraps correctly */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="font-bold text-white text-sm md:text-base truncate">YourUsername</span>
                            <span className="text-gray-500 text-xs md:text-sm flex-shrink-0">@yourhandle · Just now</span>
                          </div>
                          {/* Use whitespace-pre-wrap for line breaks and break-words for long strings */}
                          <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed text-gray-100 break-words">
                            {generatedTweet}
                          </div>
                        </div>
                      </div>

                      {/* Generated Hashtags (if any) - Displayed below main tweet content */}
                       {hashtags.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-800/60 flex flex-wrap gap-2">
                                {hashtags.map((tag, index) => (
                                    <Badge
                                        key={`${tag}-${index}`}
                                        variant="outline"
                                        className="bg-gray-800 border-gray-700 text-blue-300 text-xs font-medium cursor-pointer px-2.5 py-0.5 rounded-full hover:bg-gray-700"
                                        onClick={() => {
                                            navigator.clipboard.writeText(tag);
                                            console.log(`[Client] Copied Hashtag: ${tag}`);
                                            // toast({ title: `Copied: ${tag}` });
                                        }}
                                        title={`Copy hashtag: ${tag}`}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                      {/* Tweet Actions Footer (Placeholder - slightly less prominent) */}
                      <div className="flex justify-around text-gray-600 pt-3 border-t border-gray-800/60 mt-auto">
                        <div className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-default">
                          <MessageSquare className="h-4 w-4 md:h-5 md:w-5" /> <span className="text-xs">0</span>
                        </div>
                        <div className="flex items-center gap-1 hover:text-green-400 transition-colors cursor-default">
                           <RotateCcw className="h-4 w-4 md:h-5 md:w-5 transform scale-x-[-1]" /> <span className="text-xs">0</span>
                        </div>
                         <div className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-default">
                           <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                           <span className="text-xs">0</span>
                        </div>
                         <div className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-default">
                            <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                     // Enhanced Initial Placeholder State
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-600 text-center p-4 md:p-8">
                      <Twitter className="h-12 w-12 md:h-16 md:w-16 mb-5 text-gray-700 opacity-80" />
                      <p className="text-lg md:text-xl mb-2 text-gray-400 font-medium">Your tweet draft will appear here</p>
                      <p className="text-gray-500 text-sm md:text-base max-w-xs mx-auto">Configure the options, enter a topic, and click &quot;Generate Tweet&quot;.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Optional: Keep a section for Tweet Tips if desired, similar to Hashtag Tips */}
             {/*
            <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-white">
                  <MessageSquare className="text-blue-400 h-5 w-5" />
                  Tweet Strategy Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                 <ul className="space-y-2 list-disc list-inside pl-2 text-sm text-gray-300">
                    <li>Keep it concise (under 280 chars).</li>
                    <li>Use 1-3 relevant hashtags.</li>
                    <li>Add value: inform, entertain, or inspire.</li>
                    <li>Include visuals (images/videos) if possible.</li>
                    <li>Engage with replies and mentions.</li>
                 </ul>
              </CardContent>
            </Card>
            */}

            {/* Examples Section (Mobile - Output Column) */}
            <Card className="md:hidden bg-gray-900 border-gray-800 rounded-xl shadow-lg p-4">
                <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5" /> Example Topics</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                    {exampleTweets.map((ex, i) => (
                        <button
                            key={i}
                            onClick={() => setTopic(ex.topic)}
                            className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700/80 rounded-md text-sm text-gray-300 transition-colors duration-150 group"
                            title={`Use topic: ${ex.topic}`}
                        >
                            <span className="font-medium text-gray-100 group-hover:text-white block mb-1.5">&quot;{ex.topic}&quot;</span>
                             <div className="flex flex-wrap gap-1.5">
                                {ex.hashtags?.slice(0,4).map((tag, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 group-hover:bg-gray-600 text-gray-400 group-hover:text-gray-200 px-1.5 py-0.5 font-normal">{tag}</Badge>)}
                                 {ex.hashtags && ex.hashtags.length > 4 && <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 font-normal">...</Badge>}
                             </div>
                        </button>
                    ))}
                </CardContent>
            </Card>

          </div> {/* End Output Column */}
        </div> {/* End Main Content Grid */}
      </div> {/* End Max Width Container */}
    </div> // End Page Root Div
  );
}