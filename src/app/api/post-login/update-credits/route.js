import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export async function POST(req) {
  try {
    // Extract necessary data from the request
    const { provider, paymentId, orderId } = await req.json();
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    // Check for missing required data
    if (!provider || !paymentId || !orderId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let creditsToAdd = 0;
    let amount = 0;

    // Check Razorpay payment provider
    if (provider === 'razorpay') {
      // Fetch the payment details from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);

      // Ensure the payment is captured and the orderId matches
      if (!payment || payment.status !== 'captured' || payment.order_id !== orderId) {
        return NextResponse.json({ error: 'Invalid or failed Razorpay payment' }, { status: 400 });
      }

      amount = payment.amount / 100; // Convert from paise to INR

      // Determine credits to add based on the amount
      if (amount === 1) creditsToAdd = 50;
      else if (amount === 100) creditsToAdd = 150;
      else if (amount === 500) creditsToAdd = 600;
      else return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // Retrieve the user's profile data from Supabase
    const { data: profileData, error: profileErr } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileErr || !profileData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate the updated credits
    const updatedCredits = (profileData.credits || 0) + creditsToAdd;

    // Update the user's credits in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: updatedCredits })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    // Log the payment in the payment table
    await supabase.from('payment').insert({
      user_id: user.id,
      provider,
      amount,
      credits_added: creditsToAdd,
      status: 'completed',
      payment_id: paymentId,
      order_id: orderId,
    });

    // Return success message with updated credits
    return NextResponse.json({ message: 'Credits updated successfully', newCredits: updatedCredits });

  } catch (err) {
    console.error('Error updating credits:', err);
    return NextResponse.json({ error: 'Something went wrong', details: err.message }, { status: 500 });
  }
}
