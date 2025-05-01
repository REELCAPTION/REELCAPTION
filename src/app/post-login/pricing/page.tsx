import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">Choose Your Credits Plan</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Select a plan that fits your content creation needs. Every plan gives you access to powerful AI tools designed to boost your social media.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {/* Starter Plan */}
          <PricingCard
            title="Starter Plan"
            description="Best for casual creators"
            price="₹199"
            credits="100 credits"
            buttonText="Buy Now"
            buttonClass="bg-gray-800 hover:bg-gray-700 text-white"
          />

          {/* Pro Plan (Most Popular) */}
          <PricingCard
            title="Pro Plan"
            description="Perfect for regular creators"
            price="₹399"
            credits="300 credits"
            buttonText="Buy Now"
            buttonClass="bg-blue-600 hover:bg-blue-500 text-white"
            highlight
          />

          {/* Business Plan */}
          <PricingCard
            title="Business Plan"
            description="For teams and agencies"
            price="₹999"
            credits="800 credits"
            buttonText="Buy Now"
            buttonClass="bg-gray-800 hover:bg-gray-700 text-white"
          />
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            Frequently Asked Questions
          </h2>
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
  highlight = false,
}: {
  title: string;
  description: string;
  price: string;
  credits: string;
  buttonText: string;
  buttonClass: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl shadow-xl p-8 flex flex-col justify-between border transition-transform transform hover:scale-105 ${
        highlight
          ? "bg-gradient-to-b from-blue-900/50 to-gray-900 border-2 border-blue-500 relative scale-105"
          : "bg-gray-900 border-gray-800"
      }`}
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
        <div
          className={`rounded-lg p-4 mb-8 ${
            highlight ? "bg-blue-900/30" : "bg-gray-800"
          }`}
        >
          <p className="text-lg font-semibold text-center text-white">
            Includes {credits}
          </p>
        </div>
        <ul className="space-y-3 mb-8">
          <ToolList />
        </ul>
      </div>
      <Button className={`w-full ${buttonClass}`}>
        {buttonText}
      </Button>
    </div>
  );
}

function ToolList() {
  const tools = [
    "Viral Tweet Generator",
    "Instagram Bio & Reel Caption Generator",
    "YouTube Hook Analyzer + AI Title Generator",
    "Content Generator",
    "Hashtag Suggestion Tool",
    "AI Video Idea Generator",
  ];
  
  return (
    <>
      {tools.map((tool, index) => (
        <li key={index} className="flex items-start">
          <Check className="h-5 w-5 text-blue-400 mr-2" />
          <span className="text-gray-300">{tool}</span>
        </li>
      ))}
    </>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "What are credits?",
      a: "Credits are used to run actions within the platform. Each tool consumes a certain number of credits depending on usage.",
    },
    {
      q: "How long do credits last?",
      a: "Credits are valid for the duration of your plan subscription or until they are used up.",
    },
    {
      q: "Can I upgrade my plan?",
      a: "Yes, you can upgrade anytime. Remaining credits will carry over to your new plan.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept major credit cards, debit cards, UPI, and net banking via our secure payment gateway.",
    },
    {
      q: "Do you offer refunds?",
      a: "We offer a 7-day money-back guarantee for new purchases if you're unsatisfied. After that, no refunds for unused credits.",
    },
  ];

  return faqs.map((item, idx) => (
    <AccordionItem key={idx} value={`item-${idx + 1}`} className="border-b border-gray-800">
      <AccordionTrigger className="text-gray-300 hover:text-white px-0">
        {item.q}
      </AccordionTrigger>
      <AccordionContent className="text-gray-400">
        {item.a}
      </AccordionContent>
    </AccordionItem>
  ));
}
