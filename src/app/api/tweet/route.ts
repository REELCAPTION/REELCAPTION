// src/app/api/generate-tweet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types_db';

// --- Interfaces ---
interface TweetGenerationRequest {
    topic: string;
    tone: 'professional' | 'funny' | 'motivational' | 'sarcastic' | 'inspirational';
    tweetType: 'short tweet' | 'story-style' | 'thread starter' | 'quote tweet' | 'question-based';
    language?: string;
    cta?: 'none' | 'follow me for more' | 'retweet if you agree' | 'comment your thoughts below';
    useEmojis?: boolean;
    credits: 1 | 2; // Frontend sends the cost based on basic/premium selection
}

interface TweetGenerationResponse {
    tweet: string;
    hashtags: string[];
    metadata?: {
        characterCount: number;
        toneUsed: string;
        generationTime: number;
        creditsUsed: number;
    };
    remainingCredits: number;
}

interface ErrorResponse {
    error: string;
    details?: unknown;
    errorCode?: string;
}

// --- Constants ---
const CHAR_LIMIT = 280;
const DEFAULT_LANGUAGE = 'en';
const COHERE_API_ENDPOINT = 'https://api.cohere.ai/v1/generate';
const MAX_TOKENS_1_CREDIT = 170;
const MAX_TOKENS_2_CREDITS = 250;
const PROFILE_TABLE = 'user_profiles';
const LOG_PREFIX = '[API - Tweet]'; // For easier log filtering

// --- Helper Function for JSON Responses ---
function createErrorResponse(message: string, errorCode: string, status: number, details?: unknown): NextResponse<ErrorResponse> {
    console.error(`${LOG_PREFIX} Status: ${status}, Code: ${errorCode}, Message: ${message}`, details ? `Details: ${JSON.stringify(details)}` : '');
    return NextResponse.json({ error: message, errorCode, details }, { status });
}

// --- API Route Handler ---
export async function POST(request: NextRequest): Promise<NextResponse<TweetGenerationResponse | ErrorResponse>> {
    const startTime = Date.now();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    let userId: string | null = null;
    let creditsToDeduct: 1 | 2;
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
        let body: TweetGenerationRequest;
        try {
            body = await request.json();
        } catch (e) {
            return createErrorResponse('Invalid JSON body.', 'INVALID_JSON', 400, e instanceof Error ? e.message : String(e));
        }
        // Credits value is sent directly from frontend based on selection
        const { topic, tone, tweetType, language = DEFAULT_LANGUAGE, cta = 'none', useEmojis = false, credits } = body;
        creditsToDeduct = credits;

        // 3. --- Validate Inputs ---
        if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
            return createErrorResponse('Topic is required.', 'MISSING_TOPIC', 400);
        }
        if (!tone) { return createErrorResponse('Tone is required.', 'MISSING_TONE', 400); }
        if (!tweetType) { return createErrorResponse('Tweet Type is required.', 'MISSING_TWEET_TYPE', 400); }
        if (credits !== 1 && credits !== 2) {
             return createErrorResponse('Invalid credits value provided (must be 1 or 2).', 'INVALID_CREDITS_VALUE', 400);
        }
        console.log(`${LOG_PREFIX} User ${userId} request: Topic="${topic}", Cost=${creditsToDeduct}`);

        // 4. --- Get User Credits ---
        console.log(`${LOG_PREFIX} Fetching credits for user ${userId}...`);
        const { data: profileData, error: profileError } = await supabase
            .from(PROFILE_TABLE)
            .select('credits')
            .eq('id', userId)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') { // Profile not found
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
        // 5a. Zero Credits Check
        if (currentCredits === 0) {
            const details = `You have 0 credits. This action requires ${creditsToDeduct} credit(s). Please upgrade your plan.`;
            return createErrorResponse('You have run out of credits. Please upgrade your plan.', 'UPGRADE_REQUIRED', 402, details);
        }
        // 5b. Insufficient Credits Check
        if (currentCredits < creditsToDeduct) {
            const details = `You need ${creditsToDeduct} credit(s), but you only have ${currentCredits}. Consider upgrading.`;
            return createErrorResponse('Insufficient credits.', 'INSUFFICIENT_CREDITS', 402, details);
        }
        console.log(`${LOG_PREFIX} User ${userId} credit check passed (${currentCredits} >= ${creditsToDeduct}).`);

        // 6. --- Deduct Credits ---
        const newCreditBalance = currentCredits - creditsToDeduct;
        console.log(`${LOG_PREFIX} Attempting to deduct ${creditsToDeduct} credits from user ${userId}. New balance target: ${newCreditBalance}.`);
        const { error: updateError } = await supabase
            .from(PROFILE_TABLE)
            .update({ credits: newCreditBalance })
            .eq('id', userId);
            // Optional: .eq('credits', currentCredits) // Optimistic concurrency control

        if (updateError) {
            return createErrorResponse('Failed to update user credits before generation.', 'DB_UPDATE_ERROR', 500, updateError.message);
        }
        console.log(`${LOG_PREFIX} Successfully deducted ${creditsToDeduct} credits for user ${userId}. New balance confirmed: ${newCreditBalance}.`);

        // --- CREDITS DEDUCTED - Subsequent errors are more critical ---

        // 7. --- Prepare and Call Cohere API ---
        const apiKey = process.env.COHERE_API_KEY;
        if (!apiKey) {
            // Critical error post-deduction
            return createErrorResponse('Server configuration error occurred after credit deduction. Please contact support.', 'CONFIG_ERROR_POST_DEDUCTION', 500);
        }

        const maxTokens = creditsToDeduct === 1 ? MAX_TOKENS_1_CREDIT : MAX_TOKENS_2_CREDITS;
        const temperature = creditsToDeduct === 2 ? 0.8 : 0.7;
        const prompt = [ // (Keep prompt as defined in your original code)
          `Generate a ${tone} ${tweetType} about "${topic}" in ${language}.`,
          `- ${useEmojis ? 'Include 1-3 relevant emojis.' : 'Do not use emojis.'}`,
          `- ${cta !== 'none' ? `Include the call-to-action: "${cta}"` : 'No call-to-action needed.'}`,
          `- The entire response (tweet + hashtags) MUST be well under ${CHAR_LIMIT} characters. Ideal range: 200-270 characters.`,
          `- Include 2-3 relevant hashtags at the very end, each starting with #.`,
          `- Be concise, engaging, and shareable for Twitter/X.`,
          `- Avoid generic statements; be specific about "${topic}".`,
          `- Ensure the output flows naturally as a single piece of text (tweet followed by hashtags).`,
          `- ${creditsToDeduct === 2 ? 'Use more sophisticated language and potentially more nuanced sentence structure.' : 'Keep the language clear and direct.'}`,
          `\nTweet:`
        ].join('\n');

        console.log(`${LOG_PREFIX} Calling Cohere for user ${userId}...`);
        let generatedText : string | undefined;
        try {
            const cohereResponse = await axios.post(COHERE_API_ENDPOINT, {
                model: 'command-r-plus',
                prompt,
                max_tokens: maxTokens,
                temperature,
                k: 0,
                return_likelihoods: 'NONE',
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout: 25000,
            });
            generatedText = cohereResponse.data.generations[0]?.text?.trim();
            if (!generatedText) throw new Error("AI API returned empty content.");
        } catch (error) {
            let errorMessage = "AI API request failed after credit deduction.";
            let errorDetails: unknown = error instanceof Error ? error.message : String(error);
            let statusCode = 502; // Bad Gateway
             if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                statusCode = axiosError.response?.status || 502;
                errorDetails = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : axiosError.message;
            }
             return createErrorResponse(errorMessage, 'COHERE_API_ERROR_POST_DEDUCTION', statusCode, errorDetails);
        }
        console.log(`${LOG_PREFIX} Cohere response received for user ${userId}. Processing...`);

        // 8. --- Process Cohere Response ---
        let tweetBody = generatedText;
        let uniqueHashtags: string[] = [];
        try {
             // (Keep processing logic as defined in your original code)
            let cleanedText = generatedText
                .replace(/^tweet:/i, '').replace(/^here('s| is)? your tweet:/i, '')
                .replace(/^output:/i, '').replace(/^```json\n?/, '')
                .replace(/\n?```$/, '').replace(/^\s*Tweet:\s*/i, '').trim();

            const hashtagRegex = /#[\p{L}\p{N}_]+/gu;
            const matchedHashtags = cleanedText.match(hashtagRegex);

            if (matchedHashtags) {
                uniqueHashtags = [...new Set(matchedHashtags.filter(h => h.length > 1))];
                tweetBody = cleanedText.replace(hashtagRegex, '').replace(/\s{2,}/g, ' ').trim();
            } else {
                tweetBody = cleanedText; // No hashtags found
            }

            if (tweetBody.length > CHAR_LIMIT) {
                console.warn(`${LOG_PREFIX} Truncating generated tweet body for user ${userId} from ${tweetBody.length} to ${CHAR_LIMIT} chars.`);
                tweetBody = tweetBody.substring(0, CHAR_LIMIT).trim();
            }
             if (tweetBody.length === 0 && uniqueHashtags.length === 0) {
                throw new Error("Processed content is empty.");
            }
        } catch (processingError) {
             return createErrorResponse(
                'Failed to process AI response after credit deduction.',
                'GENERATION_PROCESSING_ERROR_POST_DEDUCTION',
                500,
                processingError instanceof Error ? processingError.message : String(processingError)
            );
        }

        // 9. --- Prepare Success Response ---
        const response: TweetGenerationResponse = {
            tweet: tweetBody,
            hashtags: uniqueHashtags,
            metadata: {
                characterCount: tweetBody.length,
                toneUsed: tone,
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
        return createErrorResponse(
            'An unexpected internal server error occurred.',
            'INTERNAL_SERVER_ERROR',
            500,
            error instanceof Error ? error.message : String(error)
        );
    }
}