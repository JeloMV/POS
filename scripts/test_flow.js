const axios = require('axios');

async function testFullFlow() {
  console.log('Testing full flow...');

  const orderPayload = {
    cust_name: 'Test Customer Juan',
    contact_number: '09171234567',
    other_contact: 'Messenger - Juan',
    branch_name: 'Balagtas',
    order_type: 'Dine-In',
    items: [
      {
        product_id: 1,
        item_name: 'Small',
        unit_price: 30.00,
        quantity: 1,
        subtotal: 35.00,
        addons: [
          { addon_name: 'Flavor: Spicy', addon_price: 0, quantity: 1 },
          { addon_name: 'Garlic Rice', addon_price: 5.00, quantity: 1 }
        ]
      },
      {
        product_id: 7,
        item_name: 'Bottled Water',
        unit_price: 15.00,
        quantity: 1,
        subtotal: 15.00,
        addons: []
      }
    ]
  };

  const rOrder = await axios.post('http://localhost:3000/api/orders', orderPayload);
  console.log('1. Order Created:', rOrder.data);
  const orderId = rOrder.data.order_id;

  const rPayMongo = await axios.post('http://localhost:3000/api/paymongo/create-link', {
    order_id: orderId,
    amount: 50.00,
    branch_name: 'Balagtas'
  });
  console.log('2. PayMongo Link Created:', rPayMongo.data.checkoutUrl);

  const rPay = await axios.post('http://localhost:3000/api/orders/' + orderId + '/pay', {
    payment_method: 'GCash',
    amount_due: 50.00,
    amount_paid: 50.00,
    change_amount: 0.00,
    gcash_reference_number: rPayMongo.data.referenceNumber || 'GCX-20261023-999'
  });
  console.log('3. Payment Processed:', rPay.data);

  const rAvail = await axios.put('http://localhost:3000/api/menu/product/1/availability');
  console.log('4. Toggle Product 1 Availability:', rAvail.data);

  await axios.put('http://localhost:3000/api/menu/product/1/availability');
  console.log('4b. Toggled back to available');

  const rArch = await axios.put('http://localhost:3000/api/menu/product/1/archive');
  console.log('5. Soft Archive Product 1:', rArch.data);
  await axios.put('http://localhost:3000/api/menu/product/1/archive');
  console.log('5b. Restored Product 1');

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

testFullFlow().catch(console.error);
