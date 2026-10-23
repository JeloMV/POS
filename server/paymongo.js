const axios = require('axios');
require('dotenv').config();

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');

const paymongoClient = axios.create({
  baseURL: 'https://api.paymongo.com/v1',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  }
});

/**
 * Create a PayMongo Payment Link for GCash / Cards / E-wallets
 * @param {Object} params - { amount (in PHP), description, remarks }
 */
async function createPaymentLink({ amount, description, remarks }) {
  try {
    const amountInCents = Math.round(Number(amount) * 100);
    const response = await paymongoClient.post('/links', {
      data: {
        attributes: {
          amount: amountInCents,
          description: description || 'Chick N Pastil Order',
          remarks: remarks || 'POS Transaction'
        }
      }
    });

    const linkData = response.data.data;
    return {
      success: true,
      linkId: linkData.id,
      checkoutUrl: linkData.attributes.checkout_url,
      referenceNumber: linkData.attributes.reference_number,
      status: linkData.attributes.status,
      raw: linkData
    };
  } catch (error) {
    const errMsg = error.response?.data?.errors?.[0]?.detail || error.message;
    console.error('PayMongo Link Error:', errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Retrieve status of a PayMongo Payment Link
 * @param {string} linkId
 */
async function getPaymentLink(linkId) {
  try {
    const response = await paymongoClient.get(`/links/${linkId}`);
    const linkData = response.data.data;
    const payments = linkData.attributes.payments || [];
    const isPaid = linkData.attributes.status === 'paid' || payments.length > 0;
    const paymentItem = payments[0]?.data?.attributes;

    return {
      success: true,
      linkId: linkData.id,
      status: linkData.attributes.status,
      isPaid: isPaid,
      referenceNumber: linkData.attributes.reference_number,
      paymentId: paymentItem?.id,
      paidAt: paymentItem?.paid_at ? new Date(paymentItem.paid_at * 1000) : null
    };
  } catch (error) {
    const errMsg = error.response?.data?.errors?.[0]?.detail || error.message;
    return { success: false, error: errMsg };
  }
}

module.exports = {
  createPaymentLink,
  getPaymentLink
};
