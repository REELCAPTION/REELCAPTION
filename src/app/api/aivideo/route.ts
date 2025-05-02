// src/app/api/video-idea/route.ts
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
    console.error("[API - VideoIdea] COHERE_API_KEY is not set. Generation will fail.");
}

// --- Interfaces ---
interface VideoIdeaRequest {
    topic: string;
    platform: string;
    videoLength: string;
    videoPurpose: string;
    videoStyle: string;
    targetAudience: string;
    mode: 'basic' | 'premium'; // Determines if script is generated and credit cost
}

interface VideoIdeaResponse {
    idea: string; // Always generated
    script?: string; // Only generated for premium
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
const CREDITS_PREMIUM = 2; // Premium generates idea + script
const LOG_PREFIX = '[API - VideoIdea]';

// --- Helper Function for JSON Responses ---
function createErrorResponse(message: string, errorCode: string, status: number, details?: unknown): NextResponse<ErrorResponse> {
    console.error(`${LOG_PREFIX} Status: ${status}, Code: ${errorCode}, Message: ${message}`, details ? `Details: ${JSON.stringify(details)}` : '');
    return NextResponse.json({ error: message, errorCode, details }, { status });
}

// --- Helper: Build Prompts (from original code, minor tweaks) ---
function buildBasicPrompt(topic: string, platform: string, length: string, purpose: string, style: string, audience: string): string {
    const lengthMap: Record<string, string> = { 'short': 'under 1 min', 'medium': '1-5 mins', 'long': '5-15 mins', 'extended': '15+ mins' };
    const platformNotes: Record<string, string> = { 'tiktok': 'engaging, trendy, hooks in 3s', 'youtube': 'polished, SEO-friendly, strong thumbnail potential', 'instagram': 'visually appealing, aesthetic', 'shorts': 'quick-paced, engaging', 'linkedin': 'professional, valuable insights' };
    return `Generate a creative video idea for: "${topic}". Video: ${lengthMap[length]} ${purpose} in ${style} style for ${platform}. Audience: ${audience}. The idea should be ${platformNotes[platform]}. Format: Compelling title + emoji, 2-3 sentences (hook, structure, USP). Include 3-4 relevant hashtags. Focus on trendy hooks. Generate ONLY the idea text.`;
}

function buildScriptPrompt(topic: string, platform: string, length: string, purpose: string, style: string, audience: string, idea: string): string {
    const scriptLengthGuide: Record<string, string> = { 'short': '100-200 words', 'medium': '300-500 words', 'long': '600-1200 words', 'extended': '1500-2500 words' };
    return `Based on this ${platform} video idea: "${idea}". Create a detailed script outline for a ${purpose} video about ${topic} (${style} style) for ${audience}. Approx script length: ${scriptLengthGuide[length]}. Include: Strong hook (5-10s), Intro, Main content sections (points, examples), Compelling CTA, B-roll/visual suggestions. Format with clear headers, timing hints, visual/audio notes. Generate ONLY the script outline.`;
}

// --- Helper: Generate with Cohere (Adapted for SDK) ---
async function generateWithCohere(prompt: string, maxTokens: number, temperature: number = 0.75): Promise<string> {
     if (!cohere) throw new Error("Cohere client not initialized");
    try {
        const response = await cohere.generate({
            prompt,
            model: 'command-r-plus', // Use R+ for better structured output like scripts
            maxTokens,
            temperature,
            k: 0,
            stopSequences: [],
            returnLikelihoods: 'NONE'
        });
        return response.generations[0]?.text?.trim() || '';
    } catch (error) {
        console.error(`${LOG_PREFIX} Error calling Cohere API:`, error);
        if (error instanceof CohereError) {
             throw new Error(`Cohere API Error (${error.statusCode}): ${error.message}`);
        }
        throw new Error('Failed to generate with Cohere');
    }
}

// --- API Route Handler ---
export async function POST(request: NextRequest): Promise<NextResponse<VideoIdeaResponse | ErrorResponse>> {
    const startTime = Date.now();
     if (!cohere) {
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
        let body: VideoIdeaRequest;
        try {
            body = await request.json();
        } catch (e) {
            return createErrorResponse('Invalid JSON body.', 'INVALID_JSON', 400, e instanceof Error ? e.message : String(e));
        }
        const { topic, platform, videoLength, videoPurpose, videoStyle, targetAudience, mode = 'basic' } = body;
        creditsToDeduct = mode === 'premium' ? CREDITS_PREMIUM : CREDITS_BASIC;

        // 3. --- Validate Inputs ---
        if (!topic) return createErrorResponse('Topic is required.', 'MISSING_TOPIC', 400);
        if (!platform) return createErrorResponse('Platform is required.', 'MISSING_PLATFORM', 400);
        if (!videoLength) return createErrorResponse('Video Length is required.', 'MISSING_LENGTH', 400);
        if (!videoPurpose) return createErrorResponse('Video Purpose is required.', 'MISSING_PURPOSE', 400);
        if (!videoStyle) return createErrorResponse('Video Style is required.', 'MISSING_STYLE', 400);
        if (!targetAudience) return createErrorResponse('Target Audience is required.', 'MISSING_AUDIENCE', 400);
        console.log(`${LOG_PREFIX} User ${userId} request: Topic="${topic}", Mode=${mode}, Cost=${creditsToDeduct}`);

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
        const ideaPrompt = buildBasicPrompt(topic, platform, videoLength, videoPurpose, videoStyle, targetAudience);
        let scriptPrompt = '';
        if (mode === 'premium') {
            // Generate idea first to feed into script prompt
        }

        console.log(`${LOG_PREFIX} Calling Cohere for Idea for user ${userId}...`);
        let generatedIdea = '';
        let generatedScript: string | undefined = undefined;

        try {
            // Generate Idea
            generatedIdea = await generateWithCohere(ideaPrompt, 500, 0.8);
            if (!generatedIdea) throw new Error("AI API returned empty content for video idea.");

            // Generate Script if Premium
            if (mode === 'premium') {
                console.log(`${LOG_PREFIX} Calling Cohere for Script for user ${userId}...`);
                scriptPrompt = buildScriptPrompt(topic, platform, videoLength, videoPurpose, videoStyle, targetAudience, generatedIdea);
                // Determine appropriate token count for script
                const scriptMaxTokens: Record<string, number> = { 'short': 300, 'medium': 600, 'long': 1200, 'extended': 2000 };
                generatedScript = await generateWithCohere(scriptPrompt, scriptMaxTokens[videoLength] || 800, 0.7);
                 if (!generatedScript) {
                      console.warn(`${LOG_PREFIX} AI API returned empty content for script, but idea was generated.`);
                      // Decide how to handle: return only idea? return error? For now, return idea but log warning.
                      generatedScript = undefined; // Explicitly set to undefined
                 }
            }
        } catch (error) {
             let errorMessage = "AI API request failed after credit deduction.";
             const errorDetails: unknown = error instanceof Error ? error.message : String(error);
             const statusCode = 502;
             if (error instanceof Error && error.message.includes("Cohere API Error")) {
                 errorMessage = error.message;
             }
             return createErrorResponse(errorMessage, 'COHERE_API_ERROR_POST_DEDUCTION', statusCode, errorDetails);
        }
        console.log(`${LOG_PREFIX} Cohere responses received for user ${userId}.`);

        // 8. --- Process Response (Cleaning done in helper) ---
        // Optional: Further cleanup if needed

        // 9. --- Prepare Success Response ---
        const response: VideoIdeaResponse = {
            idea: generatedIdea,
            script: generatedScript, // Will be undefined if not premium or script generation failed
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