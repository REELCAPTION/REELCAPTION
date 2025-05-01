// src/app/post-login/tools/caption/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Copy, RotateCcw, Save, MousePointerClick, Instagram, Info, AlertTriangle, X, CreditCard, ExternalLink, Hash, Settings2, ChevronDown, ChevronUp, MessageSquare, Heart, Send } from 'lucide-react';
import { Database } from '@/types_db';
import Link from 'next/link';

// --- Configuration Data ---
const tones = [ /* ... tones array ... */
    { value: 'casual', label: 'Casual 😎' },
    { value: 'professional', label: 'Professional 👔' },
    { value: 'funny', label: 'Funny 😂' },
    { value: 'inspirational', label: 'Inspirational ✨' },
    { value: 'aesthetic', label: 'Aesthetic 🌿' },
    { value: 'witty', label: 'Witty 😏' },
    { value: 'bold', label: 'Bold 🔥' },
    { value: 'friendly', label: 'Friendly 👋' },
];
const captionLengths = [ /* ... captionLengths array ... */
    { value: 'short', label: 'Short & Punchy (1-2 lines)' },
    { value: 'medium', label: 'Medium (3-5 lines)' },
    { value: 'long', label: 'Longer / Storytelling' }
];
const contentTypes = [ /* ... contentTypes array ... */
    { value: 'caption', label: 'Post / Reel Caption' },
    { value: 'bio', label: 'Profile Bio' }
];
const exampleContent = [ /* ... exampleContent array ... */
    {
      type: 'caption',
      description: 'Morning coffee ritual',
      content: "☕️ Slow mornings powered by caffeine and sunshine.\nThere's just something magical about that first sip.\n\nWhat's your morning must-have?\n\n#MorningRoutine #CoffeeLover #SimplePleasures #MindfulMoments"
    },
    {
      type: 'bio',
      description: 'Travel blogger profile',
      content: "✈️ Exploring the world, one adventure at a time\n📸 Sharing stories & travel tips\n✨ Chasing experiences, not things\n👇 Let's connect! | Collabs open\n📍 Currently: Bali 🇮🇩"
    },
     {
      type: 'caption',
      description: 'Showcasing a new handmade product',
      content: "Handcrafted with love ❤️ So excited to finally share this new piece!\nEach one is unique and made just for you.\n\nLimited stock available - link in bio to shop!\n\n#HandmadeWithLove #ShopSmall #ArtisanMade #NewProduct #SupportSmallBusiness"
    },
];

// Define Credit Costs
const CREDIT_COSTS = { /* ... CREDIT_COSTS object ... */
    basic: 1,
    premium: 2,
};

export default function InstagramCaptionGeneratorPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  // --- State ---
  // ... (all state variables remain the same) ...
  const [description, setDescription] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'premium'>('basic');
  const [contentType, setContentType] = useState<'caption' | 'bio'>('caption');
  const [tone, setTone] = useState('casual');
  const [captionLength, setCaptionLength] = useState('medium');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [showOutOfCreditsAlert, setShowOutOfCreditsAlert] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(CREDIT_COSTS.basic);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // --- Fetch User Credits ---
  useEffect(() => {
    const fetchCredits = async () => {
      // ... (credit fetching logic remains the same) ...
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
                    if (status === 406 || profileError.code === 'PGRST116') { throw new Error('User profile not found. Please contact support.'); }
                    else { throw new Error(`Failed to fetch credits: ${profileError.message}`); }
                } else if (data && typeof data.credits === 'number') {
                    setCurrentCredits(data.credits); console.log(`[Client] Credits loaded: ${data.credits}`);
                } else { throw new Error('Could not retrieve valid credit information.'); }
            } catch (err: any) {
                console.error("[Client] Error fetching credits:", err);
                const message = err.message || 'Could not load user credits.';
                setError(message); setCurrentCredits(null);
                if (message === 'Not authenticated') { router.push('/login'); }
            } finally { setIsLoadingCredits(false); }
    };
    fetchCredits();
  }, [supabase, router]);

  // --- Other useEffect hooks ---
  // ... (useEffect hooks remain the same) ...
   useEffect(() => {
        setRequiredCredits(CREDIT_COSTS[activeTab]);
    }, [activeTab]);
   useEffect(() => {
        setGeneratedContent('');
        setHashtags([]);
        setError(null);
    }, [contentType]);


  // --- Event Handlers ---
  // ... (handleGenerate, handleCopy, handleCopyHashtagsOnly, handleReset, handleSave remain the same) ...
  const handleGenerate = async () => {
        setError(null);
        setShowOutOfCreditsAlert(false);
        if (!description || description.trim().length === 0) { setError(`Please provide a ${contentType === 'caption' ? 'post description' : 'bio description'}.`); return; };
        if (currentCredits === null || isLoadingCredits) { setError("Cannot generate: Credit information is unavailable."); return; }
        const creditsToUse = requiredCredits;
        if (currentCredits < creditsToUse) { setShowOutOfCreditsAlert(true); return; }
        setIsGenerating(true); setGeneratedContent(''); setHashtags([]);
        console.log(`[Client] Starting ${contentType} generation. Cost: ${creditsToUse}, Mode: ${activeTab}`);
        const payload: any = { description: description.trim(), contentType, tone, includeEmojis, credits: creditsToUse };
        if (contentType === 'caption') { payload.captionLength = captionLength; payload.includeHashtags = includeHashtags; }
        try {
            const response = await fetch('/api/caption', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) {
                console.error(`[Client] API Error (${response.status}):`, data);
                if (response.status === 402 && data.errorCode === 'INSUFFICIENT_CREDITS') { setShowOutOfCreditsAlert(true); if (typeof data.currentCredits === 'number') setCurrentCredits(data.currentCredits); }
                else if (response.status === 401) { setError('Authentication error. Please log in again.'); router.push('/login'); }
                else { throw new Error(data.error || `API request failed`); }
            } else {
                console.log("[Client] Generation successful:", data);
                if (data.content) { setGeneratedContent(data.content); } else { console.warn("API response missing 'content'."); setError("No content returned."); setGeneratedContent(''); }
                if (contentType === 'caption' && includeHashtags && data.hashtags && Array.isArray(data.hashtags)) { setHashtags(data.hashtags); } else { setHashtags([]); }
                if (typeof data.remainingCredits === 'number') { setCurrentCredits(data.remainingCredits); console.log(`Credits updated to: ${data.remainingCredits}`); }
                else { console.warn("API missing remainingCredits. Deducting locally."); setCurrentCredits(currentCredits - creditsToUse); }
            }
        } catch (err: any) {
            console.error('[Client] Error in handleGenerate:', err); if (!showOutOfCreditsAlert) { setError(err.message || 'Generation failed.'); }
            setGeneratedContent(''); setHashtags([]);
        } finally { setIsGenerating(false); console.log("[Client] Generation finished."); }
    };
   const handleCopy = () => {
        if (!generatedContent) return;
        const textToCopy = contentType === 'caption' && hashtags.length > 0 ? `${generatedContent}\n\n${hashtags.join(' ')}` : generatedContent;
        navigator.clipboard.writeText(textToCopy)
        .then(() => { console.log(`[Client] ${contentType === 'caption' ? 'Caption & Hashtags' : 'Bio'} copied.`); })
        .catch(err => { console.error("[Client] Copy failed:", err); setError(`Failed to copy ${contentType}.`); });
    };
   const handleCopyHashtagsOnly = () => {
        if (!hashtags.length) return;
        navigator.clipboard.writeText(hashtags.join(' '))
        .then(() => { console.log("[Client] Hashtags Copied"); })
        .catch(err => { console.error("[Client] Hashtag copy failed:", err); setError("Failed to copy hashtags."); });
    };
   const handleReset = () => {
        setDescription(''); setGeneratedContent(''); setHashtags([]); setError(null); setShowOutOfCreditsAlert(false);
        console.log("[Client] Form reset.");
    };
   const handleSave = () => {
        if (!generatedContent) return; console.log(`[Client] Saving ${contentType} (placeholder):`, generatedContent);
        alert('Save functionality is not implemented yet.');
    };


  // --- Render ---
  return (
    <div className="min-h-screen bg-black text-white my-14 lg:my-0 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* ... Header Content ... */}
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2.5">
                    <Instagram className="text-purple-400 h-7 w-7" />
                    Instagram Caption & Bio Generator
                </h1>
                <p className="text-gray-300 text-lg">Craft engaging captions and optimized bios effortlessly</p>
            </div>
        </div>

        {/* --- Error & Notice Area --- */}
        {/* ... (Error and Notice Alerts remain the same) ... */}
        {showOutOfCreditsAlert && ( <Card className="bg-yellow-900/80 border border-yellow-700 text-yellow-100 mt-4"><CardHeader className='p-3'><div className='flex justify-between items-center'><CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16}/> Insufficient Credits</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowOutOfCreditsAlert(false)} className='text-yellow-100 hover:bg-yellow-800/50 h-auto p-1 rounded-full' aria-label="Close"><X size={18} /></Button></div></CardHeader><CardContent className='p-3 pt-0 text-sm space-y-2'><p>You need {requiredCredits} credit{requiredCredits > 1 ? 's' : ''} for {activeTab} generation, but only have {currentCredits ?? 0}.</p><Button asChild variant="default" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs h-8 px-3"><Link href='/post-login/pricing'><CreditCard className='h-4 w-4 mr-1.5'/> Please upgrade your plan.<ExternalLink className='h-3 w-3 ml-1 opacity-70'/></Link></Button></CardContent></Card> )}
        {error && !isLoadingCredits && !showOutOfCreditsAlert && ( <Card className="bg-red-900/80 border border-red-700 text-red-100 mt-4"><CardHeader className='p-3'><div className='flex justify-between items-center'><CardTitle className='text-base flex items-center gap-2'><AlertTriangle size={16}/> Error</CardTitle><Button variant="ghost" size="sm" onClick={() => setError(null)} className='text-red-100 hover:bg-red-800/50 h-auto p-1 rounded-full' aria-label="Close"><X size={18}/></Button></div></CardHeader><CardContent className='p-3 pt-0 text-sm'>{error}</CardContent></Card> )}
        {error && isLoadingCredits && ( <Card className="bg-gray-800 border border-gray-700 text-gray-300 mt-4"><CardHeader className='p-3'><CardTitle className='text-base flex items-center gap-2'><Info size={16}/> Notice</CardTitle></CardHeader><CardContent className='p-3 pt-0 text-sm'>{error} Could not load credit details. Please refresh or try logging in again.</CardContent></Card> )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* Input Section (Column 1) */}
          <div className="lg:col-span-1 space-y-6">
             {/* ... (Input Card remains the same) ... */}
              <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl md:text-2xl text-white">Content Settings</CardTitle>
                    <CardDescription className="text-gray-400 text-sm md:text-base pt-1">
                    Configure the generator for your needs
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5">
                    {/* Content Type Toggle */}
                    <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">What do you want to generate?</Label>
                    <ToggleGroup type="single" value={contentType} onValueChange={(value) => value && setContentType(value as 'caption' | 'bio')} className="grid grid-cols-2 gap-2">
                        {contentTypes.map((type) => ( <ToggleGroupItem key={type.value} value={type.value} className="text-sm data-[state=on]:bg-purple-600 data-[state=on]:text-white border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md h-10">{type.label}</ToggleGroupItem> ))}
                    </ToggleGroup>
                    </div>
                    {/* Description Input */}
                    <div className="space-y-2">
                    <Label htmlFor='description-input' className="text-sm font-medium text-gray-300 flex items-center gap-1.5">{contentType === 'caption' ? 'Describe your Post/Reel' : 'Describe your Profile/Brand'} <span className="text-red-400">*</span></Label>
                    <Textarea id='description-input' placeholder={contentType === 'caption' ? "e.g., 'Photo of me hiking...'" : "e.g., 'Fitness coach...'" }
                        className="bg-gray-950 border-gray-700 h-32 md:h-36 text-base p-4 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 rounded-md resize-none"
                        value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} required aria-required="true" />
                    </div>
                    {/* Advanced Options Toggle */}
                    <button onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2 mt-3">
                        <span className='flex items-center gap-2'><Settings2 size={16} className="text-gray-400"/> Advanced Options</span> {showAdvancedOptions ? <ChevronUp size={18}/> : <ChevronDown size={18} />}
                    </button>
                    {/* Collapsible Advanced Options */}
                    {showAdvancedOptions && ( <div className="space-y-5 pt-3 border-t border-gray-800/50 mt-1 animate-fadeIn">{/* Tone, Length, Enhancements */} {/* ... (Content of advanced options remains the same) ... */}
                        <div className="space-y-2"> <Label className="text-sm font-medium text-gray-300">Tone of Voice</Label> <ToggleGroup type="single" value={tone} onValueChange={(value) => value && setTone(value)} className="grid grid-cols-3 gap-2"> {tones.slice(0, 6).map((t) => ( <ToggleGroupItem key={t.value} value={t.value} className="text-xs md:text-[13px] data-[state=on]:bg-purple-600 data-[state=on]:text-white border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md h-9 px-2" title={t.label}>{t.label}</ToggleGroupItem> ))} </ToggleGroup> <Select value={tone} onValueChange={setTone}><SelectTrigger className="bg-gray-950 border-gray-700 text-white text-xs rounded-md mt-2 h-8"><SelectValue placeholder="More tones..." /></SelectTrigger><SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">{tones.map((t) => ( <SelectItem key={t.value} value={t.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">{t.label}</SelectItem> ))}</SelectContent></Select></div>
                        {contentType === 'caption' && ( <div className="space-y-2"> <Label htmlFor="length-select" className="text-sm font-medium text-gray-300">Desired Caption Length</Label> <Select value={captionLength} onValueChange={setCaptionLength}><SelectTrigger id="length-select" className="bg-gray-950 border-gray-700 text-white rounded-md w-full"><SelectValue placeholder="Select length..." /></SelectTrigger><SelectContent className="bg-gray-900 border-gray-700 text-white max-h-60">{captionLengths.map((l) => ( <SelectItem key={l.value} value={l.value} className="hover:bg-gray-800 focus:bg-gray-700 cursor-pointer text-sm">{l.label}</SelectItem> ))}</SelectContent></Select></div>)}
                        <div className="space-y-3 pt-2"> <Label className="text-sm font-medium text-gray-300 block mb-2">Optional Elements</Label> <div className="flex items-center space-x-3"> <Checkbox id="emojis" checked={includeEmojis} onCheckedChange={(checked) => setIncludeEmojis(Boolean(checked))} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 border-gray-600"/> <Label htmlFor="emojis" className="text-sm text-gray-300 font-normal cursor-pointer select-none">Include relevant Emojis</Label></div> {contentType === 'caption' && ( <div className="flex items-center space-x-3"> <Checkbox id="hashtags" checked={includeHashtags} onCheckedChange={(checked) => setIncludeHashtags(Boolean(checked))} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 border-gray-600"/> <Label htmlFor="hashtags" className="text-sm text-gray-300 font-normal cursor-pointer select-none">Include relevant #hashtags</Label></div>)}</div>
                    </div> )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pt-5 px-5 pb-5 border-t border-gray-800 bg-gray-900/50">
                    {/* ... (Footer content remains the same) ... */}
                     <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'basic' | 'premium')}> <TabsList className="grid grid-cols-2 w-full bg-gray-800 h-12 rounded-md p-1"> <TabsTrigger value="basic" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm"> <div className="flex flex-col items-center justify-center"><span className="font-medium">Standard</span><span className="text-[11px] text-gray-400 data-[state=active]:text-purple-100">({CREDIT_COSTS.basic} Credit)</span></div> </TabsTrigger> <TabsTrigger value="premium" className="data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white h-full rounded-md text-gray-300 text-sm"> <div className="flex flex-col items-center justify-center"><span className="font-medium">Enhanced ✨</span><span className="text-[11px] text-gray-400 data-[state=active]:text-fuchsia-100">({CREDIT_COSTS.premium} Credits)</span></div> </TabsTrigger> </TabsList> </Tabs>
                     <div className="text-center text-xs text-gray-400 w-full pt-1"> {isLoadingCredits ? ( <span className="inline-flex items-center gap-1 animate-pulse"><svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>Loading...</span> ) : currentCredits !== null ? ( <span>Credits Available: <strong className="text-white font-semibold">{currentCredits}</strong></span> ) : ( <span className="text-red-400 font-medium">Credit info unavailable</span> )}</div>
                     <Button type="button" className={`w-full h-11 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg ${ activeTab === 'basic' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white' }`} onClick={handleGenerate} disabled={!description.trim() || isGenerating || isLoadingCredits || currentCredits === null || showOutOfCreditsAlert}> {isGenerating ? ( <><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>Generating...</> ) : ( <> Generate {contentType === 'caption' ? 'Caption' : 'Bio'} <Sparkles className="h-5 w-5 ml-1.5" /></>)} </Button>
                </CardFooter>
              </Card>

            {/* Examples Section - Desktop */}
            {/* ... (Desktop Examples Card remains the same) ... */}
             <Card className="hidden md:block bg-gray-900 border-gray-800 rounded-xl shadow-lg p-4"> <CardHeader className="p-0 pb-3"> <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5" /> Examples</CardTitle> </CardHeader> <CardContent className="p-0 space-y-3"> {exampleContent.filter(ex => ex.type === contentType).slice(0, 2).map((example, index) => ( <div key={index} className="bg-gray-800/50 border border-gray-700/60 rounded-lg p-3"> <p className="text-xs text-gray-400 mb-1.5"><span className="font-medium text-gray-300">Input:</span> {example.description}</p> <Textarea readOnly className="bg-gray-950 border-gray-700 h-24 text-xs p-2 text-gray-200 placeholder:text-gray-500 resize-none rounded-md focus:ring-0 focus:outline-none whitespace-pre-wrap" value={example.content}/></div> ))} {exampleContent.filter(ex => ex.type === contentType).length === 0 && ( <p className="text-sm text-gray-500 text-center py-4">No examples for this content type yet.</p> )} </CardContent></Card>

          </div>

          {/* Output Section (Column 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generated Content Card */}
            {/* ... (Output Card remains the same) ... */}
             <Card className="bg-gray-900 border-gray-800 rounded-xl shadow-lg overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between pb-3 px-5 pt-5">
                    <div className="space-y-1"> <CardTitle className="text-xl md:text-2xl text-white"> Generated {contentType === 'caption' ? 'Caption' : 'Bio'} Preview </CardTitle> <CardDescription className="text-gray-400 text-sm md:text-base"> Review the AI-generated content below. </CardDescription></div>
                    <div className="flex gap-2 flex-shrink-0"> <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleReset} disabled={isGenerating} title="Reset Form & Output"><RotateCcw className="h-4 w-4 md:h-5 md:w-5" /></Button> <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleCopy} disabled={!generatedContent || isGenerating} title={contentType === 'caption' ? "Copy Caption & Hashtags" : "Copy Bio"}><Copy className="h-4 w-4 md:h-5 md:w-5" /></Button> <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 border-gray-700 hover:bg-gray-700/50 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg" onClick={handleSave} disabled={!generatedContent || isGenerating} title="Save Content (Coming Soon)"><Save className="h-4 w-4 md:h-5 md:w-5" /></Button></div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                    <div className="bg-gradient-to-br from-black via-gray-950 to-black rounded-xl p-4 md:p-6 min-h-[20rem] md:min-h-[24rem] border border-gray-700 flex flex-col shadow-inner relative overflow-hidden">
                        {isGenerating && ( <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8 bg-black/70 backdrop-blur-sm z-10 rounded-xl"><Instagram className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-purple-400 animate-pulse" /><p className="text-lg text-white font-medium animate-pulse">Generating {contentType}...</p><p className="text-sm text-gray-400 animate-pulse">AI is working its magic ✨</p></div> )}
                        {!isGenerating && generatedContent ? ( <div className="flex items-start gap-3 flex-grow"> <div className="mt-1 h-10 w-10 md:h-11 md:w-11 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 flex-shrink-0"></div> <div className="flex-1 min-w-0"> <div className="flex items-center justify-between mb-1"><span className="font-semibold text-white text-sm md:text-[15px] truncate">YourUsername</span> {contentType === 'caption' && ( <span className="text-gray-500 text-xs flex-shrink-0">· 1m</span> )} {contentType === 'bio' && ( <Button variant="outline" size="sm" /* Changed from "xs" */ className="h-7 px-2.5 text-xs border-gray-600 hover:bg-gray-700/50">Edit Profile</Button> /* Adjusted classes for 'sm' */ )}</div> {contentType === 'bio' && ( <div className="flex items-center gap-4 my-2 text-center"><div><span className="font-semibold text-white text-sm">105</span> <span className="text-xs text-gray-400 block">Posts</span></div><div><span className="font-semibold text-white text-sm">2.1k</span> <span className="text-xs text-gray-400 block">Followers</span></div><div><span className="font-semibold text-white text-sm">342</span> <span className="text-xs text-gray-400 block">Following</span></div></div> )} <div className="whitespace-pre-wrap text-sm md:text-[15px] leading-relaxed mt-1 text-gray-100 break-words">{generatedContent}</div> {contentType === 'caption' && hashtags.length > 0 && ( <div className="mt-3 flex flex-wrap gap-1.5">{hashtags.map((tag, index) => ( <span key={index} className="text-blue-400 hover:underline text-sm cursor-pointer">{tag}</span> ))}</div> )} {contentType === 'caption' && ( <div className="flex items-center justify-between text-gray-500 mt-4 pt-3 border-t border-gray-800/60"><div className="flex items-center gap-3"><Heart size={22} className="hover:text-red-500 transition-colors cursor-pointer"/><MessageSquare size={22} className="hover:text-white transition-colors cursor-pointer -mt-0.5 transform scale-x-[-1]"/><Send size={22} className="hover:text-white transition-colors cursor-pointer -mt-0.5"/></div><Save size={22} className="hover:text-white transition-colors cursor-pointer"/></div> )}</div></div> )
                        : ( !isGenerating && ( <div className="flex-grow flex flex-col items-center justify-center text-gray-600 text-center p-4 md:p-8"><Instagram className="h-12 w-12 md:h-16 md:w-16 mb-5 text-gray-700 opacity-80" /><p className="text-lg md:text-xl mb-2 text-gray-400 font-medium">Your {contentType} preview appears here</p><p className="text-gray-500 text-sm md:text-base max-w-xs mx-auto">Configure the options on the left and click "Generate".</p></div> ) )}
                    </div>
                    {contentType === 'caption' && hashtags.length > 0 && !isGenerating && (
                        <div className="pt-4 mt-4 border-t border-gray-800">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><Hash size={14}/> Suggested Hashtags ({hashtags.length})</Label>
                                {/* CORRECTED BUTTON SIZE */}
                                <Button variant="outline" size="sm" /* Changed from "xs" */ className="h-7 px-2 text-xs border-gray-700 hover:bg-gray-700/50" onClick={handleCopyHashtagsOnly} title="Copy Hashtags Only">
                                    <Copy size={12} className="mr-1"/> Copy Hashtags
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 bg-black rounded-md border border-gray-700">
                                {hashtags.map((hashtag, index) => ( <Badge key={index} variant="secondary" className="bg-gray-800/80 border border-gray-700/50 text-black font-normal text-xs px-2 py-0.5 cursor-default">{hashtag}</Badge> ))}
                            </div>
                        </div>
                    )}
                </CardContent>
             </Card>

            {/* Examples Section - Mobile */}
            {/* ... (Mobile Examples Card remains the same) ... */}
            <Card className="md:hidden bg-gray-900 border-gray-800 rounded-xl shadow-lg p-4"> <CardHeader className="p-0 pb-3"> <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5" /> Examples</CardTitle> </CardHeader> <CardContent className="p-0 space-y-3"> {exampleContent.filter(ex => ex.type === contentType).slice(0, 2).map((example, index) => ( <div key={index} className="bg-gray-800/50 border border-gray-700/60 rounded-lg p-3"> <p className="text-xs text-gray-400 mb-1.5"><span className="font-medium text-gray-300">Input:</span> {example.description}</p> <Textarea readOnly className="bg-gray-950 border-gray-700 h-24 text-xs p-2 text-gray-200 placeholder:text-gray-500 resize-none rounded-md focus:ring-0 focus:outline-none whitespace-pre-wrap" value={example.content}/></div> ))} {exampleContent.filter(ex => ex.type === contentType).length === 0 && ( <p className="text-sm text-gray-500 text-center py-4">No examples for this content type yet.</p> )} </CardContent></Card>

          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}