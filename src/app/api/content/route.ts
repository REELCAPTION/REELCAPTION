// src/app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios'; // Using axios for consistency
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types_db';

// --- Interfaces ---
interface ContentRequest {
  topic: string;
  contentType: string; // e.g., 'instagram', 'linkedin', etc.
  tone: string;
  audience: string;
  customAudience?: string;
  length: string; // e.g., 'short', 'medium', 'long'
  includeHashtags: boolean;
  includeCta: boolean;
  generateVariations: boolean; // This might imply higher credit cost or separate logic
  isPremium: boolean; // Used for quality and credit cost
}

interface ContentResponse {
  content: string; // Primary generated content
  variations?: string[]; // Optional variations if generated
  hashtags?: string[]; // Optional hashtags
  metadata: {
    generationTime: number;
    creditsUsed: number;
  };
  remainingCredits: number;
}

interface ErrorResponse {
    error: string;
    details?: unknown;
    errorCode: string;
}

// --- Constants ---
const COHERE_API_ENDPOINT = 'https://api.cohere.ai/v1/generate';
const PROFILE_TABLE = 'user_profiles';
const CREDITS_BASIC = 1;
const CREDITS_PREMIUM = 2;
// Consider if generateVariations should increase cost
const LOG_PREFIX = '[API - Content]';

// --- Helper Function for JSON Responses ---
function createErrorResponse(message: string, errorCode: string, status: number, details?: unknown): NextResponse<ErrorResponse> {
    console.error(`${LOG_PREFIX} Status: ${status}, Code: ${errorCode}, Message: ${message}`, details ? `Details: ${JSON.stringify(details)}` : '');
    return NextResponse.json({ error: message, errorCode, details }, { status });
}

// --- Helper: Generate Hashtags (from original code) ---
const generateHashtags = (topic: string, contentType: string): string[] => {
    const topicWords = topic.split(/\s+/)
        .filter(word => word.length > 3)
        .map(word => word.replace(/[^\w]/g, ''));
    let baseHashtags: string[] = [];
    switch(contentType) {
        case 'instagram': baseHashtags = ['InstaPost', 'InstaDaily', 'InstaMood']; break;
        case 'linkedin': baseHashtags = ['LinkedIn', 'ProfessionalDevelopment', 'CareerGrowth']; break;
        case 'facebook': baseHashtags = ['FacebookCommunity', 'SocialMedia', 'Connect']; break;
        case 'twitter': baseHashtags = ['Tweet', 'TwitterTips', 'TweetLife']; break;
        case 'youtube': baseHashtags = ['YouTube', 'YouTubeChannel', 'Subscribe']; break;
        case 'blog': baseHashtags = ['BlogPost', 'BlogContent', 'Blogging']; break;
        case 'hook': baseHashtags = ['ContentCreator', 'Viral', 'Trending']; break;
        case 'ad': baseHashtags = ['Advertisement', 'Marketing', 'DigitalMarketing']; break;
        case 'product': baseHashtags = ['ProductDescription', 'NewProduct', 'MustHave']; break;
        case 'story': baseHashtags = ['Storytelling', 'StoryTime', 'ContentStory']; break;
        default: baseHashtags = ['Content', 'SocialMedia', 'DigitalContent'];
    }
    const topicTags = topicWords.slice(0, 3).map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return Array.from(new Set([...baseHashtags, ...topicTags])).slice(0, 7).map(tag => `#${tag}`); // Ensure '#' prefix
};

// --- Helper: Create Prompt (from original code) ---
const createPrompt = (request: ContentRequest): string => {
    const targetAudience = request.audience === 'custom'
        ? request.customAudience
        : { 'general': 'the general public', 'genz': 'Generation Z', 'entrepreneurs': 'entrepreneurs', 'fitness': 'fitness enthusiasts', 'fashion': 'fashion enthusiasts', 'tech': 'tech enthusiasts' }[request.audience] || 'the general public';
    const contentDescription = { 'instagram': 'an Instagram caption', 'linkedin': 'a LinkedIn post', 'facebook': 'a Facebook post', 'twitter': 'a Twitter tweet', 'youtube': 'a YouTube video description', 'blog': 'a blog paragraph', 'hook': 'a short-form hook', 'ad': 'an ad copy', 'product': 'a product description', 'story': 'storytelling content' }[request.contentType] || 'content';
    const contentLength = { 'short': 'very brief (1-2 sentences)', 'medium': 'moderate length (4-5 sentences)', 'long': 'a full paragraph (8-10 sentences)' }[request.length] || 'moderate length';
    const ctaInstruction = request.includeCta ? "Include a compelling call-to-action." : "";

    let prompt = `Write ${contentDescription} about "${request.topic}" in a ${request.tone} tone. The content should be ${contentLength} and appeal to ${targetAudience}. ${ctaInstruction}`;
    if (request.isPremium) {
        prompt += ` Make it exceptionally engaging and unique. Optimize for maximum engagement.`;
    }
    prompt += `\nGenerate only the main content text.`; // Instruction to avoid extra explanations
    return prompt;
};

// --- API Route Handler ---
export async function POST(request: NextRequest): Promise<NextResponse<ContentResponse | ErrorResponse>> {
    const startTime = Date.now();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    let userId: string | null = null;
    let creditsToDeduct: 1 | 2;
    let currentCredits = -1;

    try {
        // 1. --- Authentication ---
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
            console.error(`${LOG_PREFIX} Authentication Error:`, sessionError?.message);
            return createErrorResponse('Authentication required.', 'AUTH_REQUIRED', 401);
        }
        userId = session.user.id;
        console.log(`${LOG_PREFIX} User ${userId} authenticated.`);

        // 2. --- Parse Request Body ---
        let body: ContentRequest;
        try {
            body = await request.json();
        } catch (e) {
            return createErrorResponse('Invalid JSON body.', 'INVALID_JSON', 400, e instanceof Error ? e.message : String(e));
        }
        const { topic, contentType, tone, audience, length, includeHashtags, includeCta, generateVariations, isPremium = false } = body;
        // Determine credit cost (adjust if variations cost more)
        creditsToDeduct = isPremium ? CREDITS_PREMIUM : CREDITS_BASIC;

        // 3. --- Validate Inputs ---
        if (!topic) return createErrorResponse('Topic is required.', 'MISSING_TOPIC', 400);
        if (!contentType) return createErrorResponse('Content type is required.', 'MISSING_CONTENT_TYPE', 400);
        if (!tone) return createErrorResponse('Tone is required.', 'MISSING_TONE', 400);
        if (!audience) return createErrorResponse('Audience is required.', 'MISSING_AUDIENCE', 400);
        if (!length) return createErrorResponse('Length is required.', 'MISSING_LENGTH', 400);
        if (audience === 'custom' && !body.customAudience) {
            return createErrorResponse('Custom audience description is required when "custom" is selected.', 'MISSING_CUSTOM_AUDIENCE', 400);
        }
        console.log(`${LOG_PREFIX} User ${userId} request: Topic="${topic}", Premium=${isPremium}, Variations=${generateVariations}, Cost=${creditsToDeduct}`);

        // 4. --- Get User Credits ---
        console.log(`${LOG_PREFIX} Fetching credits for user ${userId}...`);
        const { data: profileData, error: profileError } = await supabase.from(PROFILE_TABLE).select('credits').eq('id', userId).single();
        if (profileError) {
            if (profileError.code === 'PGRST116') return createErrorResponse('User profile not found.', 'PROFILE_NOT_FOUND', 404, profileError.message);
            return createErrorResponse('Failed to fetch user credits.', 'DB_FETCH_ERROR', 500, profileError.message);
        }
        if (profileData === null || typeof profileData.credits !== 'number' || !Number.isInteger(profileData.credits) || profileData.credits < 0) {
             return createErrorResponse('User profile data invalid.', 'PROFILE_DATA_INVALID', 404);
        }
        currentCredits = profileData.credits;
        console.log(`${LOG_PREFIX} User ${userId} current credits: ${currentCredits}`);

        // 5. --- Verify Credits ---
        if (currentCredits === 0) {
            const details = `You have 0 credits. This action requires ${creditsToDeduct} credit(s). Please upgrade.`;
            return createErrorResponse('You have run out of credits. Please upgrade.', 'UPGRADE_REQUIRED', 402, details);
        }
        if (currentCredits < creditsToDeduct) {
            const details = `You need ${creditsToDeduct} credit(s), but only have ${currentCredits}. Consider upgrading.`;
            return createErrorResponse('Insufficient credits.', 'INSUFFICIENT_CREDITS', 402, details);
        }
        console.log(`${LOG_PREFIX} User ${userId} credit check passed.`);

        // 6. --- Deduct Credits ---
        const newCreditBalance = currentCredits - creditsToDeduct;
        console.log(`${LOG_PREFIX} Deducting ${creditsToDeduct} credits for user ${userId}. New balance target: ${newCreditBalance}.`);
        const { error: updateError } = await supabase.from(PROFILE_TABLE).update({ credits: newCreditBalance }).eq('id', userId);
        if (updateError) {
            return createErrorResponse('Failed to update user credits.', 'DB_UPDATE_ERROR', 500, updateError.message);
        }
        console.log(`${LOG_PREFIX} Credits deducted for user ${userId}.`);

        // --- CREDITS DEDUCTED ---

        // 7. --- Prepare and Call Cohere API ---
        const apiKey = process.env.COHERE_API_KEY;
        if (!apiKey) return createErrorResponse('Server configuration error (API Key). Please contact support.', 'CONFIG_ERROR_POST_DEDUCTION', 500);

        const prompt = createPrompt(body);
        const model = isPremium ? 'command-r-plus' : 'command'; // Use R+ for premium
        const maxTokens = isPremium ? 400 : 250;
        const temperature = isPremium ? 0.7 : 0.75; // Adjusted premium temp slightly
        const numVariations = generateVariations ? (isPremium ? 3 : 2) : 1; // Generate more variations for premium
        let variations: string[] = [];

        console.log(`${LOG_PREFIX} Calling Cohere for user ${userId} (${numVariations} variations)...`);
        try {
            for (let i = 0; i < numVariations; i++) {
                 // Add slight variation to temperature for variety if needed
                 const currentTemp = temperature + (i * 0.05); // Small increment
                 const cohereResponse = await axios.post(COHERE_API_ENDPOINT, {
                    model: model,
                    prompt: prompt + (numVariations > 1 ? `\n(Variation ${i + 1})` : ''), // Add variation indicator to prompt if generating multiple
                    max_tokens: maxTokens,
                    temperature: currentTemp,
                    k: 0,
                    p: 0.75,
                    frequency_penalty: 0.2, // Slightly adjusted penalties
                    presence_penalty: 0.1,
                    return_likelihoods: 'NONE'
                 }, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    timeout: 30000 // Increased timeout for potentially longer calls
                 });

                const text = cohereResponse.data.generations[0]?.text?.trim();
                if (!text) throw new Error(`AI API returned empty content for variation ${i + 1}.`);

                 // Basic cleaning (remove quotes, extra whitespace)
                let cleanedText = text.replace(/^"|"$/g, '').trim();
                variations.push(cleanedText);
            }
        } catch (error) {
            let errMsg = "AI API request failed after credit deduction.";
            let errDetails: unknown = error instanceof Error ? error.message : String(error);
            let status = 502;
            if (axios.isAxiosError(error)) {
                const axiosErr = error as AxiosError;
                status = axiosErr.response?.status || 502;
                errDetails = axiosErr.response?.data ? JSON.stringify(axiosErr.response.data) : axiosErr.message;
            }
            return createErrorResponse(errMsg, 'COHERE_API_ERROR_POST_DEDUCTION', status, errDetails);
        }
        console.log(`${LOG_PREFIX} Cohere responses received for user ${userId}.`);

        // 8. --- Process Response ---
        // Content is already cleaned in the loop above.
        const finalHashtags = includeHashtags ? generateHashtags(topic, contentType) : undefined;

        // 9. --- Prepare Success Response ---
        const response: ContentResponse = {
            content: variations[0], // Primary content is the first variation
            variations: numVariations > 1 ? variations : undefined,
            hashtags: finalHashtags,
            metadata: {
                generationTime: Date.now() - startTime,
                creditsUsed: creditsToDeduct,
            },
            remainingCredits: newCreditBalance,
        };

        console.log(`${LOG_PREFIX} Generation successful for user ${userId}.`);
        return NextResponse.json(response);

    } catch (error) {
        // --- Fallback Error Handler ---
        console.error(`${LOG_PREFIX} Unhandled error for user ${userId || 'Unknown'}:`, error);
        return createErrorResponse('An unexpected internal server error occurred.', 'INTERNAL_SERVER_ERROR', 500, error instanceof Error ? error.message : String(error));
    }
}