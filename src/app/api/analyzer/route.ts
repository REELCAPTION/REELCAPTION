// src/app/api/hook-title/route.ts
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
    console.error("[API - HookTitle] COHERE_API_KEY is not set. Generation will fail.");
}

// --- Interfaces ---
interface HookTitleRequest {
    topic: string;
    niche: string;
    hookStyle: string;
    titleStyle: string;
    audienceType: string;
    tier: 'basic' | 'premium'; // Determines quality and credit cost
}

interface HookTitleResponse {
    hook: string;
    title: string;
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
const CREDITS_PREMIUM = 2; // Assume premium costs more even for combined output
const LOG_PREFIX = '[API - HookTitle]';

// --- Helper Function for JSON Responses ---
function createErrorResponse(message: string, errorCode: string, status: number, details?: unknown): NextResponse<ErrorResponse> {
    console.error(`${LOG_PREFIX} Status: ${status}, Code: ${errorCode}, Message: ${message}`, details ? `Details: ${JSON.stringify(details)}` : '');
    return NextResponse.json({ error: message, errorCode, details }, { status });
}

// --- Helper: Build Prompts (from original code, minor tweaks) ---
function buildHookPrompt(topic: string, niche: string, style: string, audience: string, premium: boolean): string {
    let prompt = `Generate a captivating YouTube video hook (first 5 seconds) about "${topic}" (${niche} niche) for a ${audience} audience. Style: ${style}.`;
    if (premium) prompt += ' Make it SEO-optimized, emotionally compelling, use a pattern interrupt or bold claim, and create curiosity.';
    prompt += ' Keep under 40 words, conversational. No clickbait. Generate ONLY the hook text.';
    return prompt;
}

function buildTitlePrompt(topic: string, niche: string, style: string, audience: string, premium: boolean): string {
    let prompt = `Generate a compelling YouTube video title about "${topic}" (${niche} niche) for a ${audience} audience. Style: ${style}.`;
    if (premium) prompt += ' Make it SEO-optimized, use emotional/power words for clicks.';
    prompt += ' Keep under 60 chars, specific, clear. No clickbait. Generate ONLY the title text.';
    return prompt;
}

// --- Helper: Generate with Cohere (from original code, adapted for SDK) ---
async function generateWithCohere(prompt: string, maxTokens: number = 150): Promise<string> {
     if (!cohere) throw new Error("Cohere client not initialized"); // Guard clause
    try {
        const response = await cohere.generate({
            prompt,
            model: 'command-r-plus', // Using R+ for better quality potentially
            maxTokens,
            temperature: 0.7,
            k:0,
            stopSequences: [],
            returnLikelihoods: 'NONE'
        });
        return response.generations[0]?.text || ''; // Return text or empty string
    } catch (error) {
        console.error(`${LOG_PREFIX} Error calling Cohere API:`, error);
        // Re-throw a simplified error or handle specific CohereError types if needed
        if (error instanceof CohereError) {
             throw new Error(`Cohere API Error (${error.statusCode}): ${error.message}`);
        }
        throw new Error('Failed to generate with Cohere');
    }
}

// --- Helper: Clean Response (from original code) ---
function cleanResponse(text: string): string {
    return text.replace(/^["']|["']$/g, '').replace(/#{1,6}\s/g, '').trim();
}


// --- API Route Handler ---
export async function POST(request: NextRequest): Promise<NextResponse<HookTitleResponse | ErrorResponse>> {
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
        let body: HookTitleRequest;
        try {
            body = await request.json();
        } catch (e) {
            return createErrorResponse('Invalid JSON body.', 'INVALID_JSON', 400, e instanceof Error ? e.message : String(e));
        }
        const { topic, niche, hookStyle, titleStyle, audienceType, tier = 'basic' } = body;
        creditsToDeduct = tier === 'premium' ? CREDITS_PREMIUM : CREDITS_BASIC;

        // 3. --- Validate Inputs ---
        if (!topic) return createErrorResponse('Topic is required.', 'MISSING_TOPIC', 400);
        if (!niche) return createErrorResponse('Niche is required.', 'MISSING_NICHE', 400);
        if (!hookStyle) return createErrorResponse('Hook Style is required.', 'MISSING_HOOK_STYLE', 400);
        if (!titleStyle) return createErrorResponse('Title Style is required.', 'MISSING_TITLE_STYLE', 400);
        if (!audienceType) return createErrorResponse('Audience Type is required.', 'MISSING_AUDIENCE', 400);
        console.log(`${LOG_PREFIX} User ${userId} request: Topic="${topic}", Tier=${tier}, Cost=${creditsToDeduct}`);

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

        // 7. --- Prepare and Call Cohere API (Parallel) ---
        const isPremium = tier === 'premium';
        const hookPrompt = buildHookPrompt(topic, niche, hookStyle, audienceType, isPremium);
        const titlePrompt = buildTitlePrompt(topic, niche, titleStyle, audienceType, isPremium);

        console.log(`${LOG_PREFIX} Calling Cohere (parallel) for user ${userId}...`);
        let hookResult = '';
        let titleResult = '';
        try {
             // Promise.all for parallel execution
            const [hookGen, titleGen] = await Promise.all([
                generateWithCohere(hookPrompt, 100), // Lower max tokens for hook
                generateWithCohere(titlePrompt, 80)  // Lower max tokens for title
            ]);
             hookResult = hookGen;
             titleResult = titleGen;

             if (!hookResult || !titleResult) {
                 // Check if *both* failed or just one - might need more granular error handling
                 throw new Error("AI API returned empty content for hook or title.");
             }

        } catch (error) {
            // Error could be from generateWithCohere internal catch or Promise.all failure
             let errorMessage = "AI API request failed after credit deduction.";
             const errorDetails: unknown = error instanceof Error ? error.message : String(error);
             const statusCode = 502; // Default Bad Gateway

             // If error message contains Cohere details from the helper
             if (error instanceof Error && error.message.includes("Cohere API Error")) {
                 errorMessage = error.message; // Use the more specific message
             }

             // Note: Differentiating which call failed in Promise.all is harder without Promise.allSettled
             return createErrorResponse(errorMessage, 'COHERE_API_ERROR_POST_DEDUCTION', statusCode, errorDetails);
        }
        console.log(`${LOG_PREFIX} Cohere responses received for user ${userId}.`);

        // 8. --- Process Response ---
        const finalHook = cleanResponse(hookResult);
        const finalTitle = cleanResponse(titleResult);

        if (!finalHook || !finalTitle) {
             return createErrorResponse(
                'Failed to process AI response (empty result) after credit deduction.',
                'GENERATION_PROCESSING_ERROR_POST_DEDUCTION',
                500,
                `Hook empty: ${!finalHook}, Title empty: ${!finalTitle}`
            );
        }

        // 9. --- Prepare Success Response ---
        const response: HookTitleResponse = {
            hook: finalHook,
            title: finalTitle,
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