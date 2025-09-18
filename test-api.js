// Test Shopify API Connection
require('dotenv').config();
const axios = require('axios');

// Shopify API configuration
const SHOPIFY_API = {
  domain: process.env.SHOPIFY_STORE_DOMAIN,
  token: process.env.SHOPIFY_ACCESS_TOKEN,
  version: process.env.SHOPIFY_API_VERSION || '2023-10'
};

// Create Shopify API client
const shopifyAPI = axios.create({
  baseURL: `https://${SHOPIFY_API.domain}/admin/api/${SHOPIFY_API.version}`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_API.token,
    'Content-Type': 'application/json'
  }
});

async function testAPIConnection() {
  console.log('Testing Shopify API Connection...');
  console.log(`Store: ${SHOPIFY_API.domain}`);
  console.log(`API Version: ${SHOPIFY_API.version}`);
  console.log(`Token: ${SHOPIFY_API.token ? 'Present' : 'Missing'}`);
  console.log('---');

  try {
    // Test 1: Get shop info
    console.log('Test 1: Getting shop information...');
    const shopResponse = await shopifyAPI.get('/shop.json');
    console.log('✅ Shop API working! Shop name:', shopResponse.data.shop.name);

    // Test 2: Get products
    console.log('\nTest 2: Getting products...');
    const productsResponse = await shopifyAPI.get('/products.json?limit=3');
    console.log('✅ Products API working! Found', productsResponse.data.products.length, 'products');
    
    if (productsResponse.data.products.length > 0) {
      const firstProduct = productsResponse.data.products[0];
      console.log('First product:', firstProduct.title, '(ID:', firstProduct.id + ')');
    }

    // Test 3: Check discount capabilities
    console.log('\nTest 3: Checking discount capabilities...');
    const priceRulesResponse = await shopifyAPI.get('/price_rules.json?limit=1');
    console.log('✅ Price rules API working! Found', priceRulesResponse.data.price_rules.length, 'existing price rules');

    console.log('\n🎉 All tests passed! Your Shopify API is ready for wholesale integration.');
    
  } catch (error) {
    console.error('❌ API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPIConnection();