// src/app/api/hashtag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types_db';

// --- Interfaces ---
interface HashtagGenerationRequest {
  topic: string;
  category?: string; // Make optional, fallback to default
  credits: 1 | 2; // Expect credits directly from frontend
}

interface HashtagGenerationResponse {
  hashtags: string[];
  nicheTips: string[]; // Only populated for premium/2-credit request
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
const DEFAULT_CATEGORY = 'general';
const CREDITS_BASIC = 1;
const CREDITS_PREMIUM = 2;
const HASHTAG_COUNT_BASIC = 10;
const HASHTAG_COUNT_PREMIUM = 20;
const LOG_PREFIX = '[API - Hashtag]';

// --- Helper Function for JSON Responses ---
function createErrorResponse(message: string, errorCode: string, status: number, details?: unknown): NextResponse<ErrorResponse> {
    console.error(`${LOG_PREFIX} Status: ${status}, Code: ${errorCode}, Message: ${message}`, details ? `Details: ${JSON.stringify(details)}` : '');
    return NextResponse.json({ error: message, errorCode, details }, { status });
}

// --- API Route Handler ---
export async function POST(request: NextRequest): Promise<NextResponse<HashtagGenerationResponse | ErrorResponse>> {
  const startTime = Date.now();
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  let userId: string | null = null;
  let creditsToDeduct: 1 | 2;
  let targetHashtagCount: number;
  let isPremiumRequest: boolean;
  let currentCredits = -1; // Initialize to invalid state

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
    let body: HashtagGenerationRequest;
    try {
        body = await request.json();
    } catch (e) {
        return createErrorResponse('Invalid JSON body.', 'INVALID_JSON', 400, e instanceof Error ? e.message : String(e));
    }

    // 3. --- Validate Inputs & Determine Cost/Count ---
    const { topic, category = DEFAULT_CATEGORY, credits } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return createErrorResponse('Topic is required.', 'MISSING_TOPIC', 400);
    }
    // Validate the credits value explicitly
    if (credits !== CREDITS_BASIC && credits !== CREDITS_PREMIUM) {
         return createErrorResponse(`Invalid credit amount specified. Must be ${CREDITS_BASIC} or ${CREDITS_PREMIUM}.`, 'INVALID_CREDITS', 400);
    }

    creditsToDeduct = credits;
    isPremiumRequest = creditsToDeduct === CREDITS_PREMIUM;
    targetHashtagCount = isPremiumRequest ? HASHTAG_COUNT_PREMIUM : HASHTAG_COUNT_BASIC;

    const safeCategory = (typeof category === 'string' && category.trim().length > 0) ? category.trim() : DEFAULT_CATEGORY;

    console.log(`${LOG_PREFIX} User ${userId} request: Topic="${topic}", Category="${safeCategory}", Credits=${creditsToDeduct}, TargetCount=${targetHashtagCount}`);

    // 4. --- Get User Credits ---
    console.log(`${LOG_PREFIX} Fetching credits for user ${userId}...`);
    const { data: profileData, error: profileError } = await supabase
      .from(PROFILE_TABLE)
      .select('credits')
      .eq('id', userId)
      .single();

    if (profileError) {
        if (profileError.code === 'PGRST116') {
            return createErrorResponse('User profile not found. Cannot check credits.', 'PROFILE_NOT_FOUND', 404, profileError.message);
        }
        return createErrorResponse('Failed to fetch user credits.', 'DB_FETCH_ERROR', 500, profileError.message);
    }
     if (profileData === null || typeof profileData.credits !== 'number' || !Number.isInteger(profileData.credits) || profileData.credits < 0) {
        return createErrorResponse('User profile data incomplete or credits invalid.', 'PROFILE_DATA_INVALID', 404);
    }
    currentCredits = profileData.credits;
    console.log(`${LOG_PREFIX} User ${userId} current credits: ${currentCredits}`);

    // 5. --- Verify Credits ---
    if (currentCredits < creditsToDeduct) {
        // Return specific error codes and messages based on frontend expectation
         const details = `You need ${creditsToDeduct} credit(s), but you only have ${currentCredits}. Please upgrade your plan.`;
         // Using 'INSUFFICIENT_CREDITS' as the errorCode consistently is better
         return NextResponse.json({
            error: 'Insufficient credits.',
            errorCode: 'INSUFFICIENT_CREDITS', // Consistent error code
            details: details,
            currentCredits: currentCredits // Send current credits back to potentially update UI
         }, { status: 402 }); // 402 Payment Required
    }
    console.log(`${LOG_PREFIX} User ${userId} credit check passed (${currentCredits} >= ${creditsToDeduct}).`);


    // 6. --- Deduct Credits ---
    const newCreditBalance = currentCredits - creditsToDeduct;
    console.log(`${LOG_PREFIX} Attempting to deduct ${creditsToDeduct} credits from user ${userId}. New balance target: ${newCreditBalance}.`);
    const { error: updateError } = await supabase
        .from(PROFILE_TABLE)
        .update({ credits: newCreditBalance })
        .eq('id', userId);

    if (updateError) {
        // Attempt to revert or log critical failure, but proceed with caution
        console.error(`${LOG_PREFIX} CRITICAL: Failed to update credits for user ${userId} AFTER verification. Error: ${updateError.message}`);
        return createErrorResponse('Failed to update user credits before generation.', 'DB_UPDATE_ERROR_CRITICAL', 500, updateError.message);
    }
    console.log(`${LOG_PREFIX} Successfully deducted ${creditsToDeduct} credits for user ${userId}. New balance confirmed: ${newCreditBalance}.`);

    // --- CREDITS DEDUCTED - Subsequent errors are more critical ---

    // 7. --- Prepare and Call Cohere API ---
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
        // This is a server config issue, should ideally not happen after credit deduction
        console.error(`${LOG_PREFIX} CRITICAL: COHERE_API_KEY not found after credit deduction for user ${userId}.`);
        return createErrorResponse('Server configuration error occurred after credit deduction. Please contact support.', 'CONFIG_ERROR_POST_DEDUCTION', 500);
    }

    // Request slightly more hashtags than needed to allow for filtering/deduplication
    const hashtagsToRequest = targetHashtagCount + 10;
    const maxTokens = isPremiumRequest ? 250 : 150; // Adjust based on requested count
    const temperature = 0.75; // Slightly higher for more variety

    // Updated prompt to request the calculated number of hashtags
    const prompt = `Generate around ${hashtagsToRequest} relevant, effective, and popular hashtags for a social media post about "${topic}" within the "${safeCategory}" category. Prioritize a mix of broad and niche hashtags.
Strictly return ONLY a valid JSON array of strings, where each string is a hashtag starting with '#'.
Example format: ["#hashtag1", "#hashtag2", "#hashtag3"]
Do NOT include any introductory text, explanations, markdown formatting, comments, or anything outside the single JSON array. The entire output MUST be only the JSON array.`;

    console.log(`${LOG_PREFIX} Calling Cohere for user ${userId} requesting ~${hashtagsToRequest} hashtags...`);
    let cohereText: string | undefined;
    try {
        const cohereResponse = await axios.post(COHERE_API_ENDPOINT, {
            model: 'command-r-plus', // Or your preferred model
            prompt,
            max_tokens: maxTokens,
            temperature,
            // k: 0, // Optional parameters if needed
            // p: 0.75,
            // frequency_penalty: 0.0,
            // presence_penalty: 0.0,
            return_likelihoods: "NONE"
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000, // Increase timeout slightly
        });
        cohereText = cohereResponse.data.generations[0]?.text?.trim();
        if (!cohereText) throw new Error("AI API returned empty content.");

    } catch (error) {
         let errorMessage = "AI API request failed after credit deduction. Please try again or contact support.";
         let errorDetails: unknown = error instanceof Error ? error.message : String(error);
         let statusCode = 502; // Bad Gateway (upstream issue)
         if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            statusCode = axiosError.response?.status || 502;
            errorDetails = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : axiosError.message;
            if (axiosError.code === 'ECONNABORTED') { // Specific timeout error
                errorMessage = "AI generation timed out after credit deduction. Your credits were used. Please try again.";
                statusCode = 504; // Gateway Timeout
            }
         }
         // Log critical failure
         console.error(`${LOG_PREFIX} CRITICAL: Cohere API call failed for user ${userId} AFTER credit deduction. Status: ${statusCode}, Details: ${errorDetails}`);
         return createErrorResponse(errorMessage, 'COHERE_API_ERROR_POST_DEDUCTION', statusCode, errorDetails);
    }
    console.log(`${LOG_PREFIX} Cohere response received for user ${userId}. Processing...`);

    // 8. --- Process Cohere Response ---
    let hashtags: string[] = [];
    try {
        // Prioritize strict JSON parsing
        const jsonMatch = cohereText.match(/\[\s*(?:\"#[^"]+\"\s*,?\s*)*\]/);
        let parsedSuccessfully = false;
        if (jsonMatch && jsonMatch[0]) {
            try {
                const parsedJson = JSON.parse(jsonMatch[0]);
                 if (Array.isArray(parsedJson) && parsedJson.every(item => typeof item === 'string' && item.startsWith('#'))) {
                    hashtags = parsedJson;
                    parsedSuccessfully = true;
                    console.log(`${LOG_PREFIX} Successfully parsed JSON array for user ${userId}.`);
                 } else {
                    console.warn(`${LOG_PREFIX} Parsed JSON for user ${userId} was not a valid hashtag array.`);
                 }
            } catch (jsonError) {
                 console.warn(`${LOG_PREFIX} JSON parsing failed for user ${userId}:`, jsonError instanceof Error ? jsonError.message : jsonError);
            }
        }

        // Fallback to regex if JSON parsing failed or didn't yield results
        if (!parsedSuccessfully) {
            console.log(`${LOG_PREFIX} JSON parsing failed or yielded no hashtags, falling back to regex for user ${userId}. Cohere Text: ${cohereText}`);
            // Use regex that captures hashtags more reliably, including non-Latin characters
            const matches = cohereText.match(/#[\p{L}\p{N}_]+/gu); // Unicode-aware regex
            if (matches && matches.length > 0) {
                hashtags = matches;
                console.log(`${LOG_PREFIX} Extracted hashtags via regex for user ${userId}.`);
            } else {
                 console.error(`${LOG_PREFIX} CRITICAL: Failed to extract any hashtags via JSON or regex for user ${userId} after credit deduction. Cohere Text: ${cohereText}`);
                 throw new Error("Failed to extract hashtags from AI response.");
            }
        }

        // Deduplicate, trim, filter, and slice to the target count
        hashtags = [...new Set(hashtags)] // Deduplicate
            .map(tag => tag.trim())
            .filter(tag => tag.length > 1 && tag.startsWith('#')) // Basic validation
            .slice(0, targetHashtagCount); // Slice to the desired count (10 or 20)

        if (hashtags.length === 0) {
             console.error(`${LOG_PREFIX} CRITICAL: No valid hashtags remained after processing for user ${userId} after credit deduction. Initial Cohere Text: ${cohereText}`);
             throw new Error("No valid hashtags were generated after processing.");
        }
    } catch (processingError) {
         // Log critical failure
         console.error(`${LOG_PREFIX} CRITICAL: Hashtag processing failed for user ${userId} AFTER credit deduction. Error: ${processingError instanceof Error ? processingError.message : processingError}`);
         return createErrorResponse(
            'Failed to process AI response after credit deduction. Please contact support.',
            'GENERATION_PROCESSING_ERROR_POST_DEDUCTION',
            500, // Internal Server Error
            processingError instanceof Error ? processingError.message : String(processingError)
        );
    }
    console.log(`${LOG_PREFIX} User ${userId} processed ${hashtags.length} final hashtags.`);

    // 9. --- Prepare Success Response ---
    let nicheTips: string[] = [];
    // Generate niche tips only for the premium (2-credit) request
    if (isPremiumRequest && hashtags.length > 0) {
        // Example niche tips logic (can be made more sophisticated)
        try {
            const exampleNicheTag = hashtags.length > 2 ? hashtags[Math.floor(hashtags.length / 2)] : (hashtags[1] || hashtags[0]);
            const topTag = hashtags[0];
            const safeTopicWord = topic.split(' ')[0]?.replace(/[^a-zA-Z0-9]/g, '') || 'Magic'; // Simple extraction
            nicheTips = [
                `🎯 Target niche audiences within '${topic}' using specific tags like ${exampleNicheTag}.`,
                `⭐ The hashtag ${topTag} often sees high engagement for '${safeCategory}' content.`,
                `📈 Consider optimal posting times: For '${safeCategory}', Weekday mornings & evenings are often effective.`,
                `💡 Build brand recall with a unique hashtag, e.g., #YourBrand${safeTopicWord}.`
            ];
        } catch (tipError) {
            console.warn(`${LOG_PREFIX} Failed to generate niche tips for user ${userId}:`, tipError);
            nicheTips = []; // Ensure it's empty on error
        }
    }

    const response: HashtagGenerationResponse = {
      hashtags,
      nicheTips,
      metadata: {
        generationTime: Date.now() - startTime,
        creditsUsed: creditsToDeduct,
      },
      remainingCredits: newCreditBalance, // Return the confirmed new balance
    };

    console.log(`${LOG_PREFIX} Generation successful for user ${userId}. Returning ${response.hashtags.length} hashtags.`);
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // --- Fallback Error Handler ---
    console.error(`${LOG_PREFIX} UNHANDLED error for user ${userId || 'Unknown'}:`, error);
    return createErrorResponse(
        'An unexpected internal server error occurred.',
        'INTERNAL_SERVER_ERROR',
        500,
        error instanceof Error ? error.message : String(error)
    );
  }
}