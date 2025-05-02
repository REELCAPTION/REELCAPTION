// src/app/post-login/tools/aivideo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Copy, RotateCcw, Save, Video, Lightbulb, FileText, Flame, Info, AlertTriangle, X, CreditCard, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
// Optional: import { useToast } from "@/components/ui/use-toast"; // Using commented out toast for consistency
// import { toast } from 'sonner'; // Commented out sonner
import { Database } from '@/types_db';
import Link from 'next/link';

// --- Configuration Data (Keep as is from your version) ---
const platforms = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'shorts', label: 'YouTube Shorts' },
  { value: 'linkedin', label: 'LinkedIn' }
];

const videoLengths = [
  { value: 'short', label: '< 1 min' },
  { value: 'medium', label: '1-5 mins' },
  { value: 'long', label: '5-15 mins' },
  { value: 'extended', label: '15+ mins' }
];

const videoPurposes = [
  { value: 'educational', label: 'Educational' },
  { value: 'entertaining', label: 'Entertaining' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'tutorial', label: 'Tutorial' }
];

const videoStyles = [
  { value: 'talking', label: 'Talking Head' },
  { value: 'voiceover', label: 'Voiceover' },
  { value: 'slideshow', label: 'Slideshow' },
  { value: 'animation', label: 'Animation' },
  { value: 'screencast', label: 'Screencast' }
];

const targetAudiences = [
  { value: 'general', label: 'General' },
  { value: 'beginners', label: 'Beginners' },
  { value: 'experts', label: 'Experts' },
  { value: 'professionals', label: 'Professionals' },
  { value: 'students', label: 'Students' },
  { value: 'seniors', label: 'Seniors' }
];

const exampleIdeas = [
  {
    topic: 'Personal Finance',
    platform: 'TikTok',
    idea: "💰 \"5 Money Apps That Changed My Life\"\n\nShow your phone screen with each app while briefly explaining how it helps you save/invest money. End with impressive savings statistics.",
    tags: ['#PersonalFinance', '#MoneySaving', '#FinTok']
  },
  {
    topic: 'Cooking',
    platform: 'YouTube',
    idea: "🍳 \"What Professional Chefs Wish Home Cooks Knew\"\n\nDemonstrate 3-5 simple cooking techniques or hacks that elevate ordinary dishes. Show the dramatic before/after results.",
    tags: ['#Cooking', '#ChefTips', '#FoodHacks']
  }
];

// Define Credit Costs
const CREDIT_COSTS = {
  basic: 2, // Basic Idea
  premium: 5, // Viral Idea + Script
};

export default function VideoIdeaGeneratorPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  // Optional: const { toast } = useToast();

  // --- State (Original UI state + Credit state) ---
  const [topic, setTopic] = useState('');
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic');
  const [platform, setPlatform] = useState('tiktok');
  const [videoLength, setVideoLength] = useState('short');
  const [videoPurpose, setVideoPurpose] = useState('educational');
  const [videoStyle, setVideoStyle] = useState('talking');
  const [targetAudience, setTargetAudience] = useState('general');
  const [error, setError] = useState<string | null>(null);

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
      setError(null); // Clear any previous errors
      setShowOutOfCreditsAlert(false); // Clear any previous alerts
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
          if (status === 406 || profileError.code === 'PGRST116') { throw new Error('User profile not found. Please contact support.'); }
          else { throw new Error(`Failed to fetch credits: ${profileError.message}`); }
        } else if (data && typeof data.credits === 'number') {
          setCurrentCredits(data.credits); console.log(`[Client] Credits loaded: ${data.credits}`);
        } else { throw new Error('Could not retrieve valid credit information.'); }
      } catch (err: unknown) {
        console.error("[Client] Error fetching credits:", err);

        let message = 'Could not load user credits.';
        if (err instanceof Error) {
          message = err.message;
        }

        setError(message); // Set error state
        setCurrentCredits(null); // Ensure credits are null on error

        if (message === 'Not authenticated') {
          // Only redirect if explicitly unauthenticated
          router.push('/login');
        }
      } finally {
        setIsLoadingCredits(false); // Ensure loading state is cleared
      }
    };
    fetchCredits();
  }, [supabase, router]); // Depend on supabase and router

  // Update required credits when tab changes
  useEffect(() => {
    setRequiredCredits(CREDIT_COSTS[activeTab]);
  }, [activeTab]);

  // --- Handle Generate Function (Fix applied here - wrapped the logic) ---
  const handleGenerate = async () => {
    // Reset error and alert states before starting a new generation attempt
    setError(null);
    setShowOutOfCreditsAlert(false);
    setGeneratedIdea(''); // Clear previous results
    setGeneratedScript('');

    // --- Frontend Validation Checks ---
    if (!topic || topic.trim().length === 0) {
      setError('Please enter your Niche or Topic first.');
      return; // Stop execution
    }

    if (currentCredits === null || isLoadingCredits) {
       // This check should ideally prevent the button from being enabled,
       // but including it here provides a fallback error message.
       setError("Cannot generate: Credit information is unavailable or still loading.");
       return; // Stop execution
    }

    const creditsToUse = requiredCredits;

    // --- Frontend Credit Check ---
    if (currentCredits < creditsToUse) {
      console.log(`[Client] Insufficient credits. Needed: ${creditsToUse}, Available: ${currentCredits}`);
      setShowOutOfCreditsAlert(true); // Trigger the alert
      return; // Stop execution
    }

    // --- Start Generation Process ---
    setIsGenerating(true);
    console.log(`[Client] Starting Video Idea generation. Cost: ${creditsToUse}, Mode: ${activeTab}`);

    try {
      const response = await fetch('/api/aivideo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          platform,
          videoLength,
          videoPurpose,
          videoStyle,
          targetAudience,
          credits: creditsToUse,
          isPremium: activeTab === 'premium',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Client] API Error (${response.status}):`, data);
        if (response.status === 402 && data.errorCode === 'INSUFFICIENT_CREDITS') {
          setShowOutOfCreditsAlert(true);
          // Update local credits if the backend sent the current amount
          if (typeof data.currentCredits === 'number') setCurrentCredits(data.currentCredits);
        } else if (response.status === 401) {
          setError('Authentication error. Please log in again.');
          router.push('/login'); // Redirect on auth failure
        } else {
          // Use error message from backend data if available
          throw new Error(data.error || `Failed to generate video idea (Status: ${response.status})`);
        }
      } else {
        // --- Success ---
        console.log("[Client] Generation successful:", data);

        if (data.idea) {
          setGeneratedIdea(data.idea);
        } else {
          console.warn("[Client] API response missing 'idea'.");
          // Optionally set a warning here if needed, but still process script if present
        }

        // Only set script if premium and script exists
        if (activeTab === 'premium' && data.script) {
          setGeneratedScript(data.script);
        } else {
          setGeneratedScript(''); // Ensure script is cleared if not premium or not returned
        }

        // Update Credits from backend response
        if (typeof data.remainingCredits === 'number') {
          setCurrentCredits(data.remainingCredits);
          console.log(`[Client] Credits updated locally to: ${data.remainingCredits}`);
        } else {
          console.warn("[Client] API success response missing remainingCredits. Credit count might be outdated until next fetch.");
          // If backend doesn't send remainingCredits, credit count might be stale on the UI
          // A more robust app might refetch credits after a successful generation if backend doesn't return them
        }
      }
    } catch (err: unknown) {
      console.error('Error generating video idea:', err);

      let message = 'An unexpected error occurred during generation.';
      if (err instanceof Error) {
        message = err.message;
      }
      // Only set a general error if it's not the specific "out of credits" scenario
      if (!showOutOfCreditsAlert) {
         setError(message);
      }
      setGeneratedIdea(''); // Clear any partial results
      setGeneratedScript('');
    } finally {
      setIsGenerating(false);
      console.log("[Client] Generation process finished.");
    }
  }; // <-- Correct closing brace for handleGenerate

  // Original copy handler
  const handleCopy = () => {
    if (!generatedIdea && !generatedScript) return; // Ensure something exists to copy
    // Copy both idea and script if premium tab is active and script exists
    const textToCopy = activeTab === 'premium' && generatedScript
      ? `Video Idea:\n${generatedIdea}\n\nScript Outline:\n${generatedScript}` // More structured combination
      : generatedIdea;
    navigator.clipboard.writeText(textToCopy);
    // Consider adding toast notification here if desired using your preferred library
    // e.g., toast.success('Copied!');
  };

  const handleReset = () => {
    setTopic('');
    setGeneratedIdea('');
    setGeneratedScript('');
    setError(null); // Reset error state
    setShowOutOfCreditsAlert(false); // Reset alert state
    // Optionally reset other input fields if desired:
    // setPlatform('tiktok');
    // setVideoLength('short');
    // setVideoPurpose('educational');
    // setVideoStyle('talking');
    // setTargetAudience('general');
  };

  const handleSave = () => {
    alert('Video idea saved to favorites!'); // Original placeholder
    // TODO: Implement actual save functionality to database
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-black text-white my-14 lg:my-0 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section (Original) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
              <Video className="text-blue-400" /> {/* Original Icon */}
              AI Video Idea Generator
            </h1>
            <p className="text-gray-300 text-lg">Get fresh, creative video ideas for any platform</p>
          </div>
        </div>

        {/* --- Error & Notice Area (Added) --- */}
        {showOutOfCreditsAlert && (
          <Card className="bg-yellow-900/80 border border-yellow-700 text-yellow-100 mt-4">
            <CardHeader className='p-3 pb-0'><div className='flex justify-between items-center'><CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16} /> Insufficient Credits</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowOutOfCreditsAlert(false)} className='text-yellow-100 hover:bg-yellow-800/50 h-auto p-1 rounded-full' aria-label="Close"><X size={18} /></Button></div></CardHeader>
            <CardContent className='p-3 pt-0 text-sm space-y-2'>
              <p>You need {requiredCredits} credit{requiredCredits > 1 ? 's' : ''} for {activeTab === 'premium' ? 'Viral Idea + Script' : 'Basic Idea'} generation, but only have {currentCredits ?? 0}.</p>
              <Button asChild variant="default" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs h-8 px-3">
                <Link href='/post-login/pricing'>
                  <CreditCard className='h-4 w-4 mr-1.5' /> Please upgrade your plan.
                  <ExternalLink className='h-3 w-3 ml-1 opacity-70' />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {error && !isLoadingCredits && !showOutOfCreditsAlert && (
          <Card className="bg-red-900/80 border border-red-700 text-red-100 mt-4">
            <CardHeader className='p-3 pb-0'><div className='flex justify-between items-center'><CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16} /> Error</CardTitle><Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close"><X size={18} /></Button></div></CardHeader>
            <CardContent className='p-3 pt-0 text-sm'>{error}</CardContent>
          </Card>
        )}
         {isLoadingCredits && !error && ( // Show loading notice only if loading and no explicit error
           <Card className="bg-gray-800 border border-gray-700 text-gray-300 mt-4">
             <CardHeader className='p-3 pb-0'>
               <CardTitle className='text-base flex items-center gap-2'><Info size={16} /> Loading</CardTitle>
             </CardHeader>
             <CardContent className='p-3 pt-0 text-sm'>Loading user credit details...</CardContent>
           </Card>
         )}
         {/* Error specific to credit loading when isLoadingCredits is true and error exists */}
         {error && isLoadingCredits && !showOutOfCreditsAlert && (
             <Card className="bg-red-900/80 border border-red-700 text-red-100 mt-4">
                 <CardHeader className='p-3 pb-0'><div className='flex justify-between items-center'><CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16} /> Error</CardTitle><Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close"><X size={18} /></Button></div></CardHeader>
                 <CardContent className='p-3 pt-0 text-sm'>{error} Credit information is unavailable. Please try refreshing the page.</CardContent>
             </Card>
         )}
        {/* --- End Error Area --- */}


        {/* Main Content Grid (Original) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Input Section (Original) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gray-900 border-gray-800 rounded-xl"> {/* Original classes */}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl md:text-2xl text-white">Video Configuration</CardTitle>
                <CardDescription className="text-gray-400 text-sm md:text-base">
                  Customize your perfect video idea
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* --- Input Fields (Original Structure) --- */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Your Niche or Topic</label>
                  <Textarea
                    placeholder="What's your video about? (e.g., cooking tips, machine learning, fitness routines)"
                    className="bg-gray-950 border-gray-700 h-24 md:h-32 text-base p-4 text-white placeholder:text-gray-500" // Original classes
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                {/* ... Keep all other input fields (Platform, Length, Purpose, Style, Audience) exactly as they were in your provided code ... */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Platform</label>
                  <ToggleGroup
                    type="single"
                    value={platform}
                    onValueChange={(value) => value && setPlatform(value)}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2" // Original classes
                  >
                    {platforms.map((p) => (
                      <ToggleGroupItem
                        key={p.value}
                        value={p.value}
                        className="text-xs md:text-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white border-gray-700 text-white" // Original classes
                      >
                        {p.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Video Length</label>
                  <Select value={videoLength} onValueChange={setVideoLength}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <SelectValue placeholder="Select video length" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {videoLengths.map((length) => (
                        <SelectItem key={length.value} value={length.value} className="hover:bg-gray-800 text-white"> {/* Original classes */}
                          {length.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Video Purpose</label>
                  <Select value={videoPurpose} onValueChange={setVideoPurpose}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select purpose" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {videoPurposes.map((purpose) => (
                        <SelectItem key={purpose.value} value={purpose.value} className="hover:bg-gray-800 text-white"> {/* Original classes */}
                          {purpose.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Video Style</label>
                  <Select value={videoStyle} onValueChange={setVideoStyle}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select style" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {videoStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value} className="hover:bg-gray-800 text-white"> {/* Original classes */}
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Target Audience</label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger className="bg-gray-950 border-gray-700 text-white"> {/* Original classes */}
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white"> {/* Original classes */}
                      {targetAudiences.map((audience) => (
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
                {/* --- Tabs (Original Styling) --- */}
                <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'premium')}>
                  <TabsList className="grid grid-cols-2 w-full bg-gray-800 h-12"> {/* Original classes */}
                    <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10"> {/* Original classes */}
                      <div className="flex flex-col items-center">
                        <span className="text-white">Basic Idea</span>
                        <span className="text-xs text-gray-300">({CREDIT_COSTS.basic} Credits)</span> {/* Updated credit text */}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10"> {/* Original classes */}
                      <div className="flex flex-col items-center">
                        <span className="text-white">Viral Idea + Script</span>
                        <span className="text-xs text-gray-300">({CREDIT_COSTS.premium} Credits)</span> {/* Updated credit text */}
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
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base md:text-lg" // Original classes
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating || isLoadingCredits || currentCredits === null || showOutOfCreditsAlert} // Updated disabled logic
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2 text-white"> {/* Original loading */}
                      Generating<span className="loading-dots">...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-white"> {/* Original text */}
                      Generate Video Idea <Sparkles className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Examples Section (Original) */}
            <div className="space-y-4 hidden md:block">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Star className="text-yellow-400 h-5 w-5" />
                Example Video Ideas
              </h2>
              <div className="space-y-4">
                {exampleIdeas.map((example, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 rounded-lg"> {/* Original classes */}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-300">{example.topic} ({example.platform})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-gray-200">{example.idea}</p>
                      <div className="flex gap-2 mt-3">
                        {example.tags.map((tag, i) => (
                          <Badge key={i} className="bg-blue-900/30 text-blue-300 border-blue-500"> {/* Original classes */}
                            {tag}
                          </Badge>
                        ))}
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
                  <CardTitle className="text-xl md:text-2xl text-white">Video Idea Preview</CardTitle>
                  <CardDescription className="text-gray-400 text-sm md:text-base">
                    Your custom video concept {activeTab === 'premium' && 'and script outline'}
                  </CardDescription>
                </div>
                {/* --- Original Action Buttons --- */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white" // Original classes
                    onClick={handleReset}
                    disabled={isGenerating || (!generatedIdea && !generatedScript)} // Adjusted disabled
                    title="Reset"
                  >
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white" // Original classes
                    onClick={handleCopy}
                    disabled={(!generatedIdea && !generatedScript) || isGenerating} // Adjusted disabled
                    title="Copy"
                  >
                    <Copy className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white" // Original classes
                    onClick={handleSave}
                    disabled={(!generatedIdea && !generatedScript) || isGenerating} // Adjusted disabled
                    title="Save"
                  >
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Video Idea Preview (Original Structure) */}
                <div className="bg-black rounded-xl p-4 md:p-6 min-h-72 md:min-h-80 border border-gray-800 flex flex-col"> {/* Original classes */}
                  {generatedIdea || generatedScript ? ( // Show if either exists
                    <div className="space-y-6">
                      {/* --- Idea Output (Original) --- */}
                      {generatedIdea && (
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-500" />
                            Video Idea
                          </h3>
                          <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed mt-2 text-white border-l-4 border-blue-500 pl-4 py-1"> {/* Original classes */}
                            {generatedIdea}
                          </div>
                        </div>
                      )}

                      {/* --- Script Output (Original, conditional) --- */}
                      {activeTab === 'premium' && generatedScript && (
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 mt-6">
                            <FileText className="h-5 w-5 text-green-500" />
                            Script Outline
                          </h3>
                          <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed mt-2 text-white bg-gray-900/50 p-4 rounded-lg"> {/* Original classes */}
                            {generatedScript}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Original Placeholder
                    <div className="text-gray-500 flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
                      <Video className="h-10 w-10 md:h-12 md:w-12 mb-4 text-blue-400" />
                      <p className="text-lg md:text-xl mb-2 text-white">Your video idea will appear here</p>
                      <p className="text-gray-500 text-sm md:text-base">Configure your video and click generate</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Platform Tips (Original) */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl"> {/* Original classes */}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-white">
                  <Lightbulb className="text-yellow-400 h-4 w-4 md:h-5 md:w-5" />
                  Platform Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platform === 'tiktok' && (
                    <p className="text-sm text-gray-300">
                      Keep your TikTok videos between 15-60 seconds, start with a strong hook in the first 3 seconds, and use trending sounds to boost visibility.
                    </p>
                  )}
                  {platform === 'youtube' && (
                    <p className="text-sm text-gray-300">
                      YouTube values watch time, so create a compelling intro, add chapters to your video, and optimize your title and thumbnail for maximum CTR.
                    </p>
                  )}
                  {platform === 'instagram' && (
                    <p className="text-sm text-gray-300">
                      Instagram Reels perform best when they are visually appealing, include on-screen text, and feature trending audio or transitions.
                    </p>
                  )}
                  {platform === 'shorts' && (
                    <p className="text-sm text-gray-300">
                      YouTube Shorts are vertical videos under 60 seconds. Use quick cuts, clear value propositions, and end with a strong CTA to your main channel.
                    </p>
                  )}
                  {platform === 'linkedin' && (
                    <p className="text-sm text-gray-300">
                      LinkedIn videos should be professional but authentic. Share industry insights, behind-the-scenes content, or educational material relevant to your network.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Examples Section - Mobile (Original) */}
            <div className="space-y-4 md:hidden">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Star className="text-yellow-400 h-5 w-5" />
                Example Video Ideas
              </h2>
              <div className="space-y-4">
                {exampleIdeas.map((example, index) => (
                  <Card key={index} className="bg-gray-900 border-gray-800 rounded-lg"> {/* Original classes */}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">{example.topic} ({example.platform})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs md:text-sm whitespace-pre-wrap text-gray-200">{example.idea}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {example.tags.map((tag, i) => (
                          <Badge key={i} className="bg-blue-900/30 text-blue-300 border-blue-500 text-xs"> {/* Original classes */}
                            {tag}
                          </Badge>
                        ))}
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
}
// Removed the extra '};' that caused the parsing error.