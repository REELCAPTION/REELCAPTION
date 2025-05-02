export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }
  
  export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    theme: {
      color: string;
    };
  }
  
  // Define a specific type for Razorpay constructor
  interface RazorpayInstance {
    open: () => void;
    close: () => void;
    // Add more methods if needed based on Razorpay's API
  }
  
  declare global {
    interface Window {
      Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
  }
  