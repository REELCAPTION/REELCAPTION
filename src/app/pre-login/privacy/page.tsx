export default function PrivacyPolicy() {
    return (
      <div className="max-w-full mx-auto p-6 md:p-8 bg-black text-white min-h-screen">
        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Privacy Policy</h1>
          
          <div className="bg-gray-900 p-6 rounded-lg">
            <p className="text-lg mb-6 text-gray-300">
              At REELCAPTION, we value your privacy. This Privacy Policy outlines how we collect, use, and protect your information.
            </p>
            
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Information We Collect</h2>
              <ul className="space-y-3 pl-5">
                <li className="relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-white before:rounded-full pl-4">Your name and email address</li>
                <li className="relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-white before:rounded-full pl-4">Usage data (tool interactions, credits used)</li>
                <li className="relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-white before:rounded-full pl-4">Payment and billing information (processed securely via Razorpay or PayPal)</li>
              </ul>
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">How We Use Your Data</h2>
              <ul className="space-y-3 pl-5">
                <li className="relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-white before:rounded-full pl-4">To provide and improve our services</li>
                <li className="relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-white before:rounded-full pl-4">To communicate important updates</li>
                <li className="relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-white before:rounded-full pl-4">To process payments securely</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
              <p className="text-gray-300">
                We do not sell or share your data with third parties. Your data is protected using best-in-class security practices.
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-400">
                If you have any concerns, please contact us at <a href="mailto:support@reelcaption.com" className="text-blue-400 hover:underline">support@reelcaption.com</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }