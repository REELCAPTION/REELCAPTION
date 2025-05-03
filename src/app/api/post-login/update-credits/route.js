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
    let planName = "";

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

        // Get order to check for planName and credits from notes
        try {
          const order = await razorpay.orders.fetch(orderId);
          if (order && order.notes) {
            planName = order.notes.planName || "";
            // Try to get credits from order notes first
            const notesCredits = parseInt(order.notes.credits);
            if (!isNaN(notesCredits) && notesCredits > 0) {
              creditsToAdd = notesCredits;
              console.log("✅ Credits from order notes:", creditsToAdd);
            }
          }
        } catch (orderError) {
          console.warn("⚠️ Unable to fetch order details:", orderError);
          // Continue with the process even if we can't get the plan name
        }

        // If credits weren't found in notes, determine them based on the amount
        if (creditsToAdd === 0) {
          if (amount === 99) creditsToAdd = 60;
          else if (amount === 199) creditsToAdd = 200;
          else if (amount === 499) creditsToAdd = 600;
          else {
            console.error("❌ Invalid amount:", amount);
            return NextResponse.json({ error: `Invalid amount: ${amount}` }, { status: 400 });
          }
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

    // Check if user exists in the user_profiles table
    const { data: profileData, error: profileErr } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .single();
    
    if (profileErr) {
      console.error("❌ Error fetching user profile:", profileErr);
      
      if (profileErr.code === 'PGRST116') { // No rows returned
        // User profile doesn't exist, create it
        console.log("Creating user profile...");
        const { error: insertErr } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            credits: creditsToAdd
          });
          
        if (insertErr) {
          console.error("❌ Failed to create user profile:", insertErr);
          return NextResponse.json({ error: 'Failed to create user profile', details: insertErr.message }, { status: 500 });
        }
        
        console.log("✅ User profile created with initial credits:", creditsToAdd);
        
        // Log the payment - with improved error handling
        try {
          // Try to log the payment
          const { error: paymentLogError } = await supabase
            .from('payment')
            .insert({
              user_id: user.id,
              provider,
              amount,
              credits_added: creditsToAdd,
              status: 'completed',
              payment_id: paymentId,
              order_id: orderId,
              plan_name: planName, // Added this field
              created_at: new Date().toISOString()
            });
          
          if (paymentLogError) {
            console.error("❌ Failed to log payment:", paymentLogError);
            // Continue since credits were added
            return NextResponse.json({ 
              message: 'User profile created and credits added successfully, but payment logging failed', 
              newCredits: creditsToAdd,
              creditsAdded: creditsToAdd,
              paymentError: paymentLogError.message
            });
          }
          
          console.log("✅ Payment logged successfully");
        } catch (paymentInsertError) {
          console.error("❌ Exception logging payment:", paymentInsertError);
          // Continue since credits were added
          return NextResponse.json({ 
            message: 'User profile created and credits added successfully, but payment logging failed', 
            newCredits: creditsToAdd,
            creditsAdded: creditsToAdd,
            paymentError: paymentInsertError.message
          });
        }
        
        return NextResponse.json({ 
          message: 'User profile created and credits added successfully', 
          newCredits: creditsToAdd,
          creditsAdded: creditsToAdd
        });
      }
      
      return NextResponse.json({ error: 'Failed to fetch user profile', details: profileErr.message }, { status: 500 });
    }
    
    if (!profileData) {
      console.error("❌ User profile not found");
      
      // Create user profile
      console.log("Creating user profile...");
      const { error: insertErr } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          credits: creditsToAdd
        });
        
      if (insertErr) {
        console.error("❌ Failed to create user profile:", insertErr);
        return NextResponse.json({ error: 'Failed to create user profile', details: insertErr.message }, { status: 500 });
      }
      
      console.log("✅ User profile created with initial credits:", creditsToAdd);
      
      // Log the payment with improved error handling
      try {
        const { error: paymentLogError } = await supabase
          .from('payment')
          .insert({
            user_id: user.id,
            provider,
            amount,
            credits_added: creditsToAdd,
            status: 'completed',
            payment_id: paymentId,
            order_id: orderId,
            plan_name: planName, // Added this field
            created_at: new Date().toISOString()
          });
        
        if (paymentLogError) {
          console.error("❌ Failed to log payment:", paymentLogError);
          // Continue since credits were added
          return NextResponse.json({ 
            message: 'User profile created and credits added successfully, but payment logging failed', 
            newCredits: creditsToAdd,
            creditsAdded: creditsToAdd,
            paymentError: paymentLogError.message
          });
        }
        
        console.log("✅ Payment logged successfully");
      } catch (paymentInsertError) {
        console.error("❌ Exception logging payment:", paymentInsertError);
        // Continue since credits were added
        return NextResponse.json({ 
          message: 'User profile created and credits added successfully, but payment logging failed', 
          newCredits: creditsToAdd,
          creditsAdded: creditsToAdd,
          paymentError: paymentInsertError.message
        });
      }
      
      return NextResponse.json({ 
        message: 'User profile created and credits added successfully', 
        newCredits: creditsToAdd,
        creditsAdded: creditsToAdd
      });
    }

    // User profile found, update credits
    console.log("✅ Found user profile, current credits:", profileData.credits);
    
    // Calculate the updated credits
    const updatedCredits = (profileData.credits || 0) + creditsToAdd;
    console.log("✅ Updated credits will be:", updatedCredits);

    // Update the user's credits in the user_profiles table
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ credits: updatedCredits })
      .eq('id', user.id);

    if (updateError) {
      console.error("❌ Failed to update credits:", updateError);
      return NextResponse.json({ error: 'Failed to update credits', details: updateError.message }, { status: 500 });
    }

    console.log("✅ Credits updated successfully");

    // Log the payment in the payment table with improved debugging and error handling
    try {
      const { error: paymentLogError } = await supabase
        .from('payment')
        .insert({
          user_id: user.id,
          provider,
          amount,
          credits_added: creditsToAdd,
          status: 'completed',
          payment_id: paymentId,
          order_id: orderId,
          plan_name: planName, // Added this field
          created_at: new Date().toISOString()
        });

      if (paymentLogError) {
        console.error("❌ Failed to log payment:", paymentLogError);
        // Don't return error here, but include it in the response
        return NextResponse.json({ 
          message: 'Credits updated successfully but failed to log payment', 
          paymentError: paymentLogError.message,
          newCredits: updatedCredits,
          creditsAdded: creditsToAdd
        });
      }
      
      console.log("✅ Payment logged successfully");
    } catch (paymentInsertError) {
      console.error("❌ Exception logging payment:", paymentInsertError);
      // Continue since credits were added
      return NextResponse.json({ 
        message: 'Credits updated successfully but failed to log payment', 
        paymentError: paymentInsertError.message,
        newCredits: updatedCredits,
        creditsAdded: creditsToAdd
      });
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