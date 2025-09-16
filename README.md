# PeachTree Wholesale App

A simple wholesale pricing app for Shopify that allows you to set wholesale prices for products and manage wholesale customers.

## Features

- Add customers to wholesale list
- Set wholesale prices for individual products
- API endpoints for theme integration
- Simple web interface for management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the app:
```bash
npm run dev
```

3. Visit http://localhost:3000 to manage wholesale settings

## API Endpoints

- `GET /api/wholesale-customers` - Get all wholesale customers
- `POST /api/wholesale-customers` - Add wholesale customer
- `GET /api/wholesale-prices` - Get all wholesale prices
- `POST /api/wholesale-prices` - Set wholesale price
- `GET /api/check-wholesale/:email` - Check if customer is wholesale
- `GET /api/wholesale-price/:productId` - Get wholesale price for product

## Theme Integration

Add this to your product templates to show wholesale pricing:

```liquid
<!-- Check if customer is wholesale and show appropriate price -->
{% if customer %}
  <script>
    // Check if customer is wholesale
    fetch('http://localhost:3000/api/check-wholesale/{{ customer.email }}')
      .then(response => response.json())
      .then(data => {
        if (data.isWholesale) {
          // Get wholesale price
          fetch('http://localhost:3000/api/wholesale-price/{{ product.id }}')
            .then(response => response.json())
            .then(priceData => {
              if (priceData.price) {
                // Update price display
                const priceElement = document.querySelector('.price');
                if (priceElement) {
                  priceElement.innerHTML = 'Wholesale: $' + priceData.price;
                }
              }
            });
        }
      });
  </script>
{% endif %}
```