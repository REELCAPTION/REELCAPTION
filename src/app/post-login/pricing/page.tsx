'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check } from 'lucide-react';

interface PricingCardProps {
  title: string;
  description: string;
  price: string;
  credits: number; // Changed to number for clarity
  buttonText: string;
  buttonClass: string;
  amount: number;
  highlight?: boolean;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
}

export default function PricingPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">Choose Your Credits Plan</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Select a plan that fits your content creation needs. Every plan gives you access to powerful AI tools designed to boost your social media.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          <PricingCard
            title="Starter Plan"
            description="Best for casual creators"
            price="₹1"
            credits={50}
            amount={1}
            buttonText="Buy Now"
            buttonClass="bg-gray-800 hover:bg-gray-700 text-white"
          />
          <PricingCard
            title="Pro Plan"
            description="Perfect for regular creators"
            price="₹100"
            credits={150}
            amount={100}
            buttonText="Buy Now"
            buttonClass="bg-blue-600 hover:bg-blue-500 text-white"
            highlight
          />
          <PricingCard
            title="Business Plan"
            description="For teams and agencies"
            price="₹999"
            credits={600}
            amount={999} // Changed to match the price shown
            buttonText="Buy Now"
            buttonClass="bg-gray-800 hover:bg-gray-700 text-white"
          />
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <FAQ />
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  title,
  description,
  price,
  credits,
  buttonText,
  buttonClass,
  amount,
  highlight = false,
}: PricingCardProps) {
  async function handleBuy() {
    try {
      const supabase = createClientComponentClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        alert("Please login to purchase credits.");
        return;
      }

      // Show loading state
      console.log(`Creating order for ${title} with ${credits} credits...`);

      const response = await fetch('/api/post-login/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount, 
          planName: title,
          planCredits: credits // Now passing as a number
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Order creation failed:", errorData);
        alert(`Failed to create order: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const order = await response.json();

      if (!order || !order.orderId) {
        alert('Failed to create order: Missing order ID');
        return;
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        alert('Missing Razorpay Key');
        return;
      }

      const options = {
        key,
        amount: order.amount,
        currency: 'INR',
        name: 'REELCAPTION',
        description: `${title} - ${credits} credits`,
        order_id: order.orderId,
        handler: async function (response: RazorpayResponse) {
          try {
            console.log("Payment successful, updating credits...");
            
            const paymentResponse = await fetch('/api/post-login/update-credits', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                provider: 'razorpay',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
              }),
            });

            if (!paymentResponse.ok) {
              const errorData = await paymentResponse.json();
              console.error("Credit update failed:", errorData);
              alert(`Failed to update credits: ${errorData.error || 'Unknown error'}`);
              return;
            }

            const paymentData = await paymentResponse.json();
            
            if (paymentData.error) {
              console.error("Credit update failed:", paymentData.error);
              alert(`Failed to update credits: ${paymentData.error}`);
              return;
            }

            alert(`Payment Successful! ${paymentData.creditsAdded} credits added.`);
            
            // Optional: Refresh the page or update the UI to show the new credit balance
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (error) {
            console.error("Error handling payment success:", error);
            alert("An error occurred while processing your payment. Please contact support.");
          }
        },
        prefill: {
          name: "",
          email: order.userEmail || "",
        },
        theme: {
          color: '#6366f1',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description}`);
      });
      razorpay.open();
    } catch (error) {
      console.error("Error in handleBuy:", error);
      alert("An error occurred. Please try again later.");
    }
  }

  return (
    <div
      className={`rounded-2xl shadow-xl p-8 flex flex-col justify-between border transition-transform transform hover:scale-105 ${highlight ? 'bg-gradient-to-b from-blue-900/50 to-gray-900 border-2 border-blue-500 relative scale-105' : 'bg-gray-900 border-gray-800'}`}
    >
      {highlight && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 hover:bg-blue-400">
          Most Popular
        </Badge>
      )}
      <div>
        <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
        <p className="text-gray-400 mb-6">{description}</p>
        <div className="mb-6">
          <span className="text-4xl font-bold text-white">{price}</span>
          <span className="text-gray-400">/month</span>
        </div>
        <div className={`rounded-lg p-4 mb-8 ${highlight ? 'bg-blue-900/30' : 'bg-gray-800'}`}>
          <p className="text-lg font-semibold text-center text-white">Includes {credits} credits</p>
        </div>
        <ul className="space-y-3 mb-8">
          <ToolList />
        </ul>
      </div>
      <Button onClick={handleBuy} className={`w-full ${buttonClass}`}>
        {buttonText}
      </Button>
    </div>
  );
}

function ToolList() {
  const tools = [
    'Viral Tweet Generator',
    'Instagram Bio & Reel Caption Generator',
    'YouTube Hook Analyzer + AI Title Generator',
    'Content Generator',
    'Hashtag Suggestion Tool',
    'AI Video Idea Generator',
  ];

  return (
    <>
      {tools.map((tool, index) => (
        <li key={index} className="flex items-start">
          <Check className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-gray-300">{tool}</span>
        </li>
      ))}
    </>
  );
}

function FAQ() {
  const faqs = [
    { q: 'What are credits?', a: 'Credits are used to run actions within the platform. Each tool consumes a certain number of credits depending on usage and settings (e.g., premium generation).' },
    { q: 'How long do credits last?', a: 'Credits are valid for the duration of your plan subscription or until they are used up, whichever comes first. They typically reset at the start of your next billing cycle.' },
    { q: 'Can I upgrade or downgrade my plan?', a: 'Yes, you can usually upgrade or downgrade your plan at any time. Changes typically take effect at the start of your next billing cycle. Check specific terms.' },
    { q: 'What payment methods do you accept?', a: 'We accept major credit cards, debit cards, UPI, and net banking via our secure payment gateway (e.g., Stripe, Razorpay).' },
    { q: 'Do you offer refunds?', a: 'We generally do not offer refunds for partially used plans or unused credits. We might offer a limited money-back guarantee for initial purchases under specific conditions. Please refer to our refund policy.' },
  ];

  return faqs.map((item, idx) => (
    <AccordionItem key={idx} value={`item-${idx + 1}`} className="border-b border-gray-800 last:border-b-0">
      <AccordionTrigger className="text-left text-gray-300 hover:text-white px-0 hover:no-underline">
        {item.q}
      </AccordionTrigger>
      <AccordionContent className="text-gray-400 pb-4">{item.a}</AccordionContent>
    </AccordionItem>
  ));
}