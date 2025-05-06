// services/payment/providers/CODProvider.js
class CODProvider {
  async fakeProcess() {
    // Simulate successful payment for COD
    return {
      transactionId: `COD-${Date.now()}`,
      rawResponse: { status: 'success' }
    };
  }

  async fakeRefund() {
    // COD doesn't support refunds in this flow
    return { status: 'not_supported' };
  }
}

module.exports = CODProvider;