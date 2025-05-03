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
    // Parse request body
    const body = await req.json();
    const { amount, planName, planCredits } = body;

    console.log("📊 Create order request:", { amount, planName, planCredits });

    // Get user from token
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("❌ Unauthorized: User not found or token expired", error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);
    console.log("Creating Razorpay Order...");

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        userId: user.id,
        email: user.email,
        planName: planName || "",
        credits: planCredits?.toString() || "0", // store credits
      },
    });

    console.log("✅ Razorpay Order Response:", {
      id: order.id,
      amount: order.amount,
      currency: order.currency
    });

    // Return order data to the frontend
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      userEmail: user.email,
      paymentUrl: `https://checkout.razorpay.com/v1/checkout/embedded?order_id=${order.id}`,
    });
  } catch (err) {
    console.error("❌ Error in create-order API:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}