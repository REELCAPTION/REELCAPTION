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
    const { provider, paymentId, orderId } = await req.json();
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!provider || !paymentId || !orderId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let creditsToAdd = 0;
    let amount = 0;

    if (provider === 'razorpay') {
      const payment = await razorpay.payments.fetch(paymentId);

      if (!payment || payment.status !== 'captured' || payment.order_id !== orderId) {
        return NextResponse.json({ error: 'Invalid or failed Razorpay payment' }, { status: 400 });
      }

      amount = payment.amount / 100; // Convert from paise to INR

      if (amount === 199) creditsToAdd = 100;
      else if (amount === 399) creditsToAdd = 300;
      else if (amount === 999) creditsToAdd = 800;
      else return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    const { data: profileData, error: profileErr } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileErr || !profileData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedCredits = (profileData.credits || 0) + creditsToAdd;

    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: updatedCredits })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    await supabase.from('payment').insert({
      user_id: user.id,
      provider,
      amount,
      credits_added: creditsToAdd,
      status: 'completed',
      payment_id: paymentId,
      order_id: orderId,
    });

    return NextResponse.json({ message: 'Credits updated', newCredits: updatedCredits });
  } catch (err) {
    console.error('Credit update error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
