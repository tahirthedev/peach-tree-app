const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
let wholesalePrices = {};
let wholesaleCustomers = new Set();

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

// Generate unique discount code
function generateDiscountCode(customerEmail, discountAmount) {
  const timestamp = Date.now();
  const cleanEmail = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `WS-${cleanEmail.slice(0, 8)}-${discountAmount.replace('.', '')}-${timestamp}`;
}

// Create Shopify discount code
async function createShopifyDiscount(discountCode, discountAmount, customerEmail) {
  try {
    console.log(`Creating discount: ${discountCode} for $${discountAmount}`);
    
    // First create price rule
    const priceRule = {
      price_rule: {
        title: `Wholesale Discount - ${customerEmail}`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'fixed_amount',
        value: `-${discountAmount}`,
        once_per_customer: false,
        usage_limit: 1,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };

    const priceRuleResponse = await shopifyAPI.post('/price_rules.json', priceRule);
    const priceRuleId = priceRuleResponse.data.price_rule.id;
    console.log(`Price rule created with ID: ${priceRuleId}`);

    // Then create discount code
    const discountCodeData = {
      discount_code: {
        code: discountCode,
        usage_count: 0
      }
    };

    await shopifyAPI.post(`/price_rules/${priceRuleId}/discount_codes.json`, discountCodeData);
    console.log(`Discount code created: ${discountCode}`);

    return {
      success: true,
      discountCode,
      priceRuleId
    };
  } catch (error) {
    console.error('Error creating Shopify discount:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>PeachTree Wholesale Manager</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, button { padding: 10px; margin: 5px 0; }
            button { background: #007cba; color: white; border: none; cursor: pointer; }
            button:hover { background: #005a87; }
            .customer-list, .product-list { margin-top: 30px; }
            .item { padding: 10px; border: 1px solid #ddd; margin: 5px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>PeachTree Wholesale Manager</h1>
            
            <h2>Add Wholesale Customer</h2>
            <div class="form-group">
                <label>Customer Email:</label>
                <input type="email" id="customerEmail" placeholder="customer@example.com">
                <button onclick="addWholesaleCustomer()">Add Wholesale Customer</button>
            </div>
            
            <h2>Set Wholesale Price</h2>
            <div class="form-group">
                <label>Product ID:</label>
                <input type="text" id="productId" placeholder="Product ID">
                <label>Wholesale Price:</label>
                <input type="number" id="wholesalePrice" placeholder="29.99" step="0.01">
                <button onclick="setWholesalePrice()">Set Wholesale Price</button>
            </div>
            
            <div class="customer-list">
                <h3>Wholesale Customers</h3>
                <div id="customersList"></div>
            </div>
            
            <div class="product-list">
                <h3>Wholesale Prices</h3>
                <div id="pricesList"></div>
            </div>
        </div>
        
        <script>
            function addWholesaleCustomer() {
                const email = document.getElementById('customerEmail').value;
                if (!email) return;
                
                fetch('/api/wholesale-customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                })
                .then(response => response.json())
                .then(data => {
                    alert('Customer added successfully!');
                    loadCustomers();
                    document.getElementById('customerEmail').value = '';
                });
            }
            
            function setWholesalePrice() {
                const productId = document.getElementById('productId').value;
                const price = document.getElementById('wholesalePrice').value;
                if (!productId || !price) return;
                
                fetch('/api/wholesale-prices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, price: parseFloat(price) })
                })
                .then(response => response.json())
                .then(data => {
                    alert('Wholesale price set successfully!');
                    loadPrices();
                    document.getElementById('productId').value = '';
                    document.getElementById('wholesalePrice').value = '';
                });
            }
            
            function loadCustomers() {
                fetch('/api/wholesale-customers')
                .then(response => response.json())
                .then(customers => {
                    const list = document.getElementById('customersList');
                    list.innerHTML = customers.map(email => 
                        '<div class="item">' + email + '</div>'
                    ).join('');
                });
            }
            
            function loadPrices() {
                fetch('/api/wholesale-prices')
                .then(response => response.json())
                .then(prices => {
                    const list = document.getElementById('pricesList');
                    list.innerHTML = Object.entries(prices).map(([productId, price]) => 
                        '<div class="item">Product ID: ' + productId + ' - $' + price + '</div>'
                    ).join('');
                });
            }
            
            // Load data on page load
            loadCustomers();
            loadPrices();
        </script>
    </body>
    </html>
  `);
});

// API Routes
app.get('/api/wholesale-customers', (req, res) => {
  res.json(Array.from(wholesaleCustomers));
});

app.post('/api/wholesale-customers', (req, res) => {
  const { email } = req.body;
  wholesaleCustomers.add(email);
  res.json({ success: true, email });
});

app.get('/api/wholesale-prices', (req, res) => {
  res.json(wholesalePrices);
});

app.post('/api/wholesale-prices', (req, res) => {
  const { productId, price } = req.body;
  wholesalePrices[productId] = price;
  res.json({ success: true, productId, price });
});

// API to check if customer is wholesale (for theme integration)
app.get('/api/check-wholesale/:email', (req, res) => {
  const { email } = req.params;
  const isWholesale = wholesaleCustomers.has(email);
  res.json({ isWholesale });
});

// API to get wholesale price for product (for theme integration)
app.get('/api/wholesale-price/:productId', (req, res) => {
  const { productId } = req.params;
  const price = wholesalePrices[productId];
  res.json({ price: price || null });
});

// Process wholesale checkout - NEW FUNCTIONALITY
app.post('/api/process-wholesale-checkout', async (req, res) => {
  const { customerEmail, cartItems, cartTotal } = req.body;

  try {
    console.log(`Processing wholesale checkout for: ${customerEmail}`);
    console.log(`Cart total: $${cartTotal}`);
    console.log(`Cart items:`, cartItems);

    // Check if customer is wholesale
    if (!wholesaleCustomers.has(customerEmail)) {
      return res.status(403).json({ error: 'Not a wholesale customer' });
    }

    // Calculate wholesale total
    let wholesaleTotal = 0;
    let hasWholesaleItems = false;

    for (const item of cartItems) {
      const productId = item.product_id.toString();
      const quantity = item.quantity;
      const regularPrice = item.price;

      console.log(`Processing item - Product ID: ${productId}, Quantity: ${quantity}, Regular Price: $${regularPrice}`);

      if (wholesalePrices[productId]) {
        const wholesaleLineTotal = wholesalePrices[productId] * quantity;
        wholesaleTotal += wholesaleLineTotal;
        hasWholesaleItems = true;
        console.log(`Wholesale price found: $${wholesalePrices[productId]} x ${quantity} = $${wholesaleLineTotal}`);
      } else {
        wholesaleTotal += regularPrice * quantity;
        console.log(`No wholesale price, using regular: $${regularPrice} x ${quantity}`);
      }
    }

    console.log(`Wholesale total: $${wholesaleTotal}`);

    // If no wholesale items, proceed normally
    if (!hasWholesaleItems) {
      console.log('No wholesale items found, proceeding with regular checkout');
      return res.json({ 
        requiresDiscount: false,
        checkoutUrl: '/checkout'
      });
    }

    // Calculate discount needed
    const discountAmount = cartTotal - wholesaleTotal;
    console.log(`Discount amount needed: $${discountAmount}`);

    if (discountAmount <= 0) {
      console.log('No discount needed, wholesale price is same or higher');
      return res.json({ 
        requiresDiscount: false,
        checkoutUrl: '/checkout'
      });
    }

    // Generate and create discount code
    const discountCode = generateDiscountCode(customerEmail, discountAmount.toFixed(2));
    const discountResult = await createShopifyDiscount(discountCode, discountAmount.toFixed(2), customerEmail);

    if (discountResult.success) {
      console.log(`Discount code created successfully: ${discountCode}`);
      return res.json({
        requiresDiscount: true,
        discountCode,
        discountAmount: discountAmount.toFixed(2),
        wholesaleTotal: wholesaleTotal.toFixed(2),
        checkoutUrl: `/checkout?discount=${discountCode}`
      });
    } else {
      console.error('Failed to create discount code:', discountResult.error);
      return res.status(500).json({ 
        error: 'Failed to create discount code',
        details: discountResult.error
      });
    }

  } catch (error) {
    console.error('Error processing wholesale checkout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API to create wholesale discount code
app.post('/api/create-wholesale-discount/:email', async (req, res) => {
  const { email } = req.params;
  
  if (!wholesaleCustomers.has(email)) {
    return res.status(403).json({ error: 'Customer is not authorized for wholesale pricing' });
  }

  try {
    // Create a unique discount code for this customer
    const discountCode = `WHOLESALE-${email.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${Date.now()}`;
    
    // Calculate discount percentage based on wholesale prices
    // This is a simplified approach - you might want to create specific discounts per product
    const discountPercentage = 50; // Example: 50% off for wholesale customers
    
    const discount = {
      price_rule: {
        title: `Wholesale Discount for ${email}`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'percentage',
        value: `-${discountPercentage}.0`,
        customer_selection: 'prerequisite',
        prerequisite_customer_ids: [], // You'd need to get the Shopify customer ID
        once_per_customer: false,
        usage_limit: null,
        starts_at: new Date().toISOString(),
        ends_at: null
      }
    };

    // Note: This requires Shopify API integration
    // For now, return the discount code
    res.json({ 
      discountCode,
      message: 'Apply this code at checkout for wholesale pricing',
      discountPercentage
    });
    
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ error: 'Failed to create discount code' });
  }
});

app.listen(PORT, () => {
  console.log(`PeachTree Wholesale App running on http://localhost:${PORT}`);
  console.log('Visit the URL above to manage wholesale customers and prices');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Shopify API configured:', !!process.env.SHOPIFY_ACCESS_TOKEN);
  console.log('');
  console.log('IMPORTANT: Add these environment variables for Shopify integration:');
  console.log('SHOPIFY_DOMAIN=your-store.myshopify.com');
  console.log('SHOPIFY_ACCESS_TOKEN=your-access-token');
});