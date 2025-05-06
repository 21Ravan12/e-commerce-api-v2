// services/payment/PaymentError.js
class PaymentError extends Error {
  constructor(message, paymentMethod, amount, originalError) {
    super(message);
    this.name = 'PaymentError';
    this.paymentMethod = paymentMethod || 'unknown';
    this.amount = amount || 0;
    this.originalError = originalError;
    this.isOperational = true;
    this.success = false;
    
    // Ensure stack trace is properly captured
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }
  }
  
  toJSON() {
    return {
      error: this.message,
      paymentMethod: this.paymentMethod,
      amount: this.amount,
      success: this.success,
      ...(this.originalError && { originalError: this.originalError.message })
    };
  }
  
  // Add toString() for better logging
  toString() {
    return `[${this.name}] ${this.message} (Method: ${this.paymentMethod}, Amount: ${this.amount})`;
  }
}

// Helper function to ensure any error becomes a PaymentError
PaymentError.fromError = (error, paymentMethod, amount) => {
  if (error instanceof PaymentError) {
    return error;
  }
  return new PaymentError(
    error.message,
    paymentMethod,
    amount,
    error
  );
};

module.exports = PaymentError;