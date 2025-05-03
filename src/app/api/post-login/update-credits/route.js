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
      console.error("❌ Missing data:", { provider, paymentId, orderId });
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Unauthorized:", userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    
    let creditsToAdd = 0;
    let amount = 0;

    // Check Razorpay payment provider
    if (provider === 'razorpay') {
      try {
        // Fetch the payment details from Razorpay
        const payment = await razorpay.payments.fetch(paymentId);
        console.log("✅ Razorpay payment details:", payment);

        // Ensure the payment is captured and the orderId matches
        if (!payment) {
          console.error("❌ Payment not found");
          return NextResponse.json({ error: 'Payment not found' }, { status: 400 });
        }
        
        if (payment.status !== 'captured') {
          console.error("❌ Payment not captured:", payment.status);
          return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
        }
        
        if (payment.order_id !== orderId) {
          console.error("❌ Order ID mismatch:", { payment_order_id: payment.order_id, provided_order_id: orderId });
          return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 });
        }

        amount = payment.amount / 100; // Convert from paise to INR
        console.log("✅ Payment amount:", amount);

        // Determine credits to add based on the amount
        if (amount === 1) creditsToAdd = 50;
        else if (amount === 100) creditsToAdd = 150;
        else if (amount === 999) creditsToAdd = 600; // Updated to match your UI price
        else {
          console.error("❌ Invalid amount:", amount);
          return NextResponse.json({ error: `Invalid amount: ${amount}` }, { status: 400 });
        }
        
        console.log("✅ Credits to add:", creditsToAdd);
      } catch (razorpayError) {
        console.error("❌ Razorpay API error:", razorpayError);
        return NextResponse.json({ error: 'Failed to verify payment with Razorpay', details: razorpayError.message }, { status: 500 });
      }
    } else {
      console.error("❌ Unsupported provider:", provider);
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // Retrieve the user's profile data from Supabase
    const { data: profileData, error: profileErr } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error("❌ Profile error:", profileErr);
      return NextResponse.json({ error: 'Failed to fetch user profile', details: profileErr.message }, { status: 500 });
    }
    
    if (!profileData) {
      console.error("❌ User not found in database");
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log("✅ Current user credits:", profileData.credits);

    // Calculate the updated credits
    const updatedCredits = (profileData.credits || 0) + creditsToAdd;
    console.log("✅ Updated credits will be:", updatedCredits);

    // Update the user's credits in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: updatedCredits })
      .eq('id', user.id);

    if (updateError) {
      console.error("❌ Failed to update credits:", updateError);
      return NextResponse.json({ error: 'Failed to update credits', details: updateError.message }, { status: 500 });
    }

    console.log("✅ Credits updated successfully");

    // Log the payment in the payment table
    const { error: paymentLogError } = await supabase.from('payment').insert({
      user_id: user.id,
      provider,
      amount,
      credits_added: creditsToAdd,
      status: 'completed',
      payment_id: paymentId,
      order_id: orderId,
    });

    if (paymentLogError) {
      console.error("❌ Failed to log payment:", paymentLogError);
      // Don't return error here, we'll still consider the transaction successful
      // since the credits were updated
    } else {
      console.log("✅ Payment logged successfully");
    }

    // Return success message with updated credits
    return NextResponse.json({ 
      message: 'Credits updated successfully', 
      newCredits: updatedCredits,
      creditsAdded: creditsToAdd
    });

  } catch (err) {
    console.error('❌ Unexpected error updating credits:', err);
    return NextResponse.json({ error: 'Something went wrong', details: err.message }, { status: 500 });
  }
}