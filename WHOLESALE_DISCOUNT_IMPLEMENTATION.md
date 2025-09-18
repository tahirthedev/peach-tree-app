# Wholesale Dynamic Discount Implementation Guide

## Overview
This document outlines the complete implementation of a dynamic discount system that allows wholesale customers to see wholesale pricing throughout their entire shopping experience, including at checkout.

## Current State vs Target State

### Current State:
- Cart page shows wholesale pricing ($13)
- Checkout page shows regular pricing (£30)
- No actual price modification at checkout

### Target State:
- Cart page shows wholesale pricing ($13)
- Checkout page also shows wholesale pricing ($13)
- Dynamic discount codes auto-applied at checkout

## Implementation Strategy

### Phase 1: Shopify API Setup
1. Create Shopify Private App
2. Configure API permissions
3. Get API credentials
4. Test API connectivity

### Phase 2: Backend Enhancement
1. Add Shopify API integration to server.js
2. Create discount code generation functions
3. Add price calculation logic
4. Add cart-to-checkout bridge functionality

### Phase 3: Frontend Integration
1. Modify cart.liquid checkout process
2. Add discount application before checkout redirect
3. Implement error handling and fallbacks

### Phase 4: Testing & Optimization
1. Test wholesale customer flow
2. Test regular customer flow
3. Handle edge cases
4. Performance optimization

## Detailed Implementation Steps

### Step 1: Create Shopify Private App

#### 1.1 Access Shopify Admin
- Go to your Shopify admin: `https://[your-store].myshopify.com/admin`
- Navigate to: Settings → Apps and sales channels

#### 1.2 Create Private App
- Click "Develop apps"
- Click "Create an app"
- App name: "PeachTree Wholesale Manager"
- App developer: Your name/email

#### 1.3 Configure API Scopes
**Admin API Permissions Needed:**
- `read_discounts` - Read discount codes
- `write_discounts` - Create/modify discount codes
- `read_products` - Read product information
- `read_price_rules` - Read pricing rules
- `write_price_rules` - Create pricing rules
- `read_customers` - Read customer information

#### 1.4 Get API Credentials
After creating the app, you'll get:
- **API Access Token** (keep this secret)
- **API Secret Key** (keep this secret)
- **Store Domain** (your-store.myshopify.com)

### Step 2: Environment Configuration

#### 2.1 Update .env file
```env
# Existing variables
PORT=3000

# New Shopify API variables
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2023-10
```

#### 2.2 Install Required Dependencies
```bash
npm install axios
```

### Step 3: Backend Implementation

#### 3.1 Add Shopify API Client (server.js)
```javascript
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
```

#### 3.2 Add Discount Generation Functions
```javascript
// Generate unique discount code
function generateDiscountCode(customerEmail, discountAmount) {
  const timestamp = Date.now();
  const cleanEmail = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `WS-${cleanEmail.slice(0, 8)}-${discountAmount}-${timestamp}`;
}

// Create Shopify discount code
async function createShopifyDiscount(discountCode, discountAmount, customerEmail) {
  try {
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

    // Then create discount code
    const discountCodeData = {
      discount_code: {
        code: discountCode,
        usage_count: 0
      }
    };

    await shopifyAPI.post(`/price_rules/${priceRuleId}/discount_codes.json`, discountCodeData);

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
```

#### 3.3 Add Cart Processing Route
```javascript
// Process wholesale checkout
app.post('/api/process-wholesale-checkout', async (req, res) => {
  const { customerEmail, cartItems, cartTotal } = req.body;

  try {
    // Check if customer is wholesale
    if (!wholesaleCustomers.has(customerEmail)) {
      return res.status(403).json({ error: 'Not a wholesale customer' });
    }

    // Calculate wholesale total
    let wholesaleTotal = 0;
    let hasWholesaleItems = false;

    for (const item of cartItems) {
      const productId = item.product_id;
      const quantity = item.quantity;
      const regularPrice = item.price;

      if (wholesalePrices[productId]) {
        wholesaleTotal += wholesalePrices[productId] * quantity;
        hasWholesaleItems = true;
      } else {
        wholesaleTotal += regularPrice * quantity;
      }
    }

    // If no wholesale items, proceed normally
    if (!hasWholesaleItems) {
      return res.json({ 
        requiresDiscount: false,
        checkoutUrl: '/checkout'
      });
    }

    // Calculate discount needed
    const discountAmount = cartTotal - wholesaleTotal;

    if (discountAmount <= 0) {
      return res.json({ 
        requiresDiscount: false,
        checkoutUrl: '/checkout'
      });
    }

    // Generate and create discount code
    const discountCode = generateDiscountCode(customerEmail, discountAmount.toFixed(2));
    const discountResult = await createShopifyDiscount(discountCode, discountAmount.toFixed(2), customerEmail);

    if (discountResult.success) {
      return res.json({
        requiresDiscount: true,
        discountCode,
        discountAmount: discountAmount.toFixed(2),
        checkoutUrl: `/checkout?discount=${discountCode}`
      });
    } else {
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
```

### Step 4: Frontend Implementation

#### 4.1 Modify Cart.liquid Checkout Process
Replace the existing checkout button functionality:

```javascript
// Handle wholesale checkout - updated version
async function handleWholesaleCheckout() {
  if (!isWholesaleCustomer) {
    window.location.href = '/checkout';
    return;
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutText = document.getElementById('checkout-text');
  
  // Show processing state
  checkoutText.textContent = 'Processing...';
  checkoutBtn.disabled = true;

  try {
    // Gather cart data
    const cartResponse = await fetch('/cart.js');
    const cartData = await cartResponse.json();

    const requestData = {
      customerEmail: '{{ customer.email }}',
      cartItems: cartData.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price / 100 // Convert from cents
      })),
      cartTotal: cartData.total_price / 100 // Convert from cents
    };

    // Process wholesale checkout
    const response = await fetch('/api/process-wholesale-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();

    if (result.requiresDiscount) {
      // Show discount applied message
      alert(`Wholesale discount of $${result.discountAmount} has been applied! Proceeding to checkout...`);
      window.location.href = result.checkoutUrl;
    } else {
      // No discount needed
      window.location.href = result.checkoutUrl;
    }

  } catch (error) {
    console.error('Error processing wholesale checkout:', error);
    alert('Error processing checkout. Please try again.');
    
    // Reset button state
    checkoutText.textContent = 'Proceed to Checkout';
    checkoutBtn.disabled = false;
  }
}
```

### Step 5: Testing Scenarios

#### 5.1 Wholesale Customer with Wholesale Products
- Expected: Discount code applied, checkout shows wholesale price

#### 5.2 Wholesale Customer with Mixed Products
- Expected: Discount applied only to wholesale products

#### 5.3 Wholesale Customer with No Wholesale Products
- Expected: No discount, regular checkout process

#### 5.4 Regular Customer
- Expected: Normal checkout process, no discount code

### Step 6: Error Handling & Edge Cases

#### 6.1 API Failures
- Fallback to regular checkout if discount creation fails
- Log errors for debugging

#### 6.2 Discount Code Conflicts
- Generate unique codes with timestamps
- Handle Shopify API rate limits

#### 6.3 Customer Experience
- Clear messaging about discount application
- Loading states during processing

### Step 7: Security Considerations

#### 7.1 API Security
- Keep Shopify access tokens secure
- Validate customer wholesale status server-side

#### 7.2 Discount Abuse Prevention
- Short expiration times on discount codes
- Single-use discount codes
- Server-side validation

## Deployment Checklist

- [ ] Shopify Private App created
- [ ] API permissions configured
- [ ] Environment variables set
- [ ] Backend routes implemented
- [ ] Frontend checkout updated
- [ ] Testing completed
- [ ] Error handling implemented
- [ ] Security measures in place

## Maintenance Notes

### Regular Tasks
- Monitor API usage and rate limits
- Clean up expired discount codes
- Review wholesale customer list
- Update API versions as needed

### Troubleshooting
- Check Shopify API status
- Verify access token validity
- Monitor server logs for errors
- Test with different cart configurations

## Future Enhancements

### Possible Improvements
- Bulk discount code management
- Customer notification system
- Analytics and reporting
- Automated customer approval workflow
- Mobile app integration

---

*Document created: September 18, 2025*
*Last updated: September 18, 2025*