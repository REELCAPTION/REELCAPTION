// src/app/api/caption/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CohereClient, CohereError } from 'cohere-ai'; // Use Cohere SDK
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types_db';

// --- Initialize Cohere Client ---
const cohereApiKey = process.env.COHERE_API_KEY;
let cohere: CohereClient | null = null;
if (cohereApiKey) {
    cohere = new CohereClient({ token: cohereApiKey });
} else {
    console.error("[API - Caption] COHERE_API_KEY is not set. Caption generation will fail.");
}

// --- Interfaces ---
interface CaptionRequest {
    description: string;
    contentType: 'caption' | 'bio'; // Explicit types
    tone: string;
    captionLength?: string; // Only for 'caption' type
    includeEmojis: boolean;
    includeHashtags?: boolean; // Only for 'caption' type
    selectedTab: 'basic' | 'premium'; // Determines quality and credit cost
    // creditsToDeduct: 1 | 2; // Let backend determine cost based on selectedTab
}

interface CaptionResponse {
    content: string;
    hashtags?: string[]; // Only returned for captions if requested
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
const PROFILE_TABLE = 'user_profiles';
const CREDITS_BASIC = 1;
const CREDITS_PREMIUM = 2;
const LOG_PREFIX = '[API - Caption]';

// --- Helper Function for JSON Responses ---
function createErrorResponse(message: string, errorCode: string, status: number, details?: unknown): NextResponse<ErrorResponse> {
    console.error(`${LOG_PREFIX} Status: ${status}, Code: ${errorCode}, Message: ${message}`, details ? `Details: ${JSON.stringify(details)}` : '');
    return NextResponse.json({ error: message, errorCode, details }, { status });
}

// --- Helper: Construct Prompts (from original code, minor tweaks) ---
function constructCaptionPrompt(desc: string, tone: string, length: string | undefined, emojis: boolean, hashtags: boolean | undefined, premium: boolean): string {
    let prompt = `Generate an engaging Instagram ${premium ? 'premium ' : ''}caption for: "${desc}". Tone: ${tone}.`;
    const lengthMap: Record<string, string> = { short: '1-2 sentences', medium: '3-4 sentences', long: '4-6 sentences' };
    prompt += ` Length: ${lengthMap[length || 'medium']}.`;
    prompt += emojis ? ' Include relevant emojis naturally.' : ' Do not include emojis.';
    if (hashtags) prompt += ` Include ${premium ? '5-7' : '3-5'} relevant hashtags at the end.`; else prompt += ' Do not include hashtags.';
    if (premium) prompt += ' Make it unique with a strong hook, call-to-action, creative expression, and good readability.';
    prompt += '\nGenerate only the caption text and hashtags (if requested), without explanations.';
    return prompt;
}

function constructBioPrompt(desc: string, tone: string, emojis: boolean, premium: boolean): string {
    let prompt = `Generate an Instagram ${premium ? 'premium ' : ''}bio (under 150 chars) for: "${desc}". Tone: ${tone}.`;
    prompt += emojis ? ' Include relevant emojis strategically.' : ' Do not include emojis.';
    prompt += ` Include: description, key interests/specialties${premium ? ', value proposition' : ''}, and a call-to-action/tagline.`;
    if (premium) prompt += ' Be creative, memorable, use line breaks (| or •) for structure, and optimize for discoverability.';
    prompt += '\nGenerate only the bio text with line breaks, without explanations.';
    return prompt;
}

// --- Helper: Calculate Max Tokens (from original code) ---
function calculateMaxTokens(contentType: string, captionLength?: string): number {
    if (contentType === 'bio') return 100;
    const lengthMap: Record<string, number> = { short: 150, medium: 250, long: 350 };
    return lengthMap[captionLength || 'medium'] || 250;
}

// --- Helper: Extract Hashtags (from original code) ---
function extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\p{L}\p{N}_]+/gu; // Unicode-aware
    const matches = content.match(hashtagRegex) || [];
    return [...new Set(matches.filter(tag => tag.length > 1))]; // Ensure unique and valid
}

// --- API Route Handler ---
export async function POST(request: NextRequest): Promise<NextResponse<CaptionResponse | ErrorResponse>> {
    const startTime = Date.now();
    if (!cohere) { // Check if client initialized
        return createErrorResponse('AI Service is not configured.', 'CONFIG_ERROR', 503);
    }
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
        let body: CaptionRequest;
        try {
            body = await request.json();
        } catch (e) {
            return createErrorResponse('Invalid JSON body.', 'INVALID_JSON', 400, e instanceof Error ? e.message : String(e));
        }
        const { description, contentType, tone, captionLength, includeEmojis, includeHashtags, selectedTab = 'basic' } = body;
        creditsToDeduct = selectedTab === 'premium' ? CREDITS_PREMIUM : CREDITS_BASIC;

        // 3. --- Validate Inputs ---
        if (!description) return createErrorResponse('Description is required.', 'MISSING_DESCRIPTION', 400);
        if (!contentType || (contentType !== 'caption' && contentType !== 'bio')) return createErrorResponse('Valid Content Type (caption/bio) is required.', 'INVALID_CONTENT_TYPE', 400);
        if (!tone) return createErrorResponse('Tone is required.', 'MISSING_TONE', 400);
        if (contentType === 'caption' && !captionLength) return createErrorResponse('Caption Length is required for captions.', 'MISSING_CAPTION_LENGTH', 400);
        console.log(`${LOG_PREFIX} User ${userId} request: Type="${contentType}", Premium=${selectedTab === 'premium'}, Cost=${creditsToDeduct}`);

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
        let prompt = '';
        const isPremium = selectedTab === 'premium';
        if (contentType === 'caption') {
            prompt = constructCaptionPrompt(description, tone, captionLength, includeEmojis, includeHashtags, isPremium);
        } else { // contentType === 'bio'
            prompt = constructBioPrompt(description, tone, includeEmojis, isPremium);
        }

        console.log(`${LOG_PREFIX} Calling Cohere for user ${userId}...`);
        let generatedContent : string = '';
        try {
            const generation = await cohere.generate({
                prompt: prompt,
                model: isPremium ? 'command-r-plus' : 'command',
                maxTokens: calculateMaxTokens(contentType, captionLength),
                temperature: isPremium ? 0.7 : 0.8,
                k: 0,
                stopSequences: [],
                returnLikelihoods: 'NONE',
            });
            generatedContent = generation.generations[0]?.text?.trim() || '';
            if (!generatedContent) throw new Error("AI API returned empty content.");

        } catch (error) {
            let errorMessage = "AI API request failed after credit deduction.";
            let errorDetails: unknown = error instanceof Error ? error.message : String(error);
            let statusCode = 500; // Default internal error

            if (error instanceof CohereError) {
                statusCode = error.statusCode ?? 502; // Use Cohere status or Bad Gateway
                errorDetails = { name: error.name, message: error.message, body: error.body };
            }
             return createErrorResponse(errorMessage, 'COHERE_API_ERROR_POST_DEDUCTION', statusCode, errorDetails);
        }
        console.log(`${LOG_PREFIX} Cohere response received for user ${userId}.`);

        // 8. --- Process Response ---
        let finalHashtags: string[] | undefined = undefined;
        // Re-extract hashtags from the final generated content IF it was a caption and requested
        if (contentType === 'caption' && includeHashtags) {
            finalHashtags = extractHashtags(generatedContent);
             // Optionally remove hashtags from the main content body if they were included by Cohere despite instructions
             // generatedContent = generatedContent.replace(/#[\p{L}\p{N}_]+/gu, '').trim();
        }

        // 9. --- Prepare Success Response ---
        const response: CaptionResponse = {
            content: generatedContent,
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