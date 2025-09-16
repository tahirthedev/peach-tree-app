# PeachTree Wholesale App - Installation Guide

## Quick Start

1. **Navigate to your app folder:**
   ```bash
   cd "f:\downloads\peachtree-homepage (1)\peach-tree-app"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the app:**
   ```bash
   npm start
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:3000
   ```

## How to Use

### Adding Wholesale Customers
1. Go to http://localhost:3000
2. In the "Add Wholesale Customer" section, enter customer email
3. Click "Add Wholesale Customer"

### Setting Wholesale Prices
1. In the "Set Wholesale Price" section:
   - Enter the Product ID (you can find this in Shopify admin)
   - Enter the wholesale price (e.g., 29.99)
   - Click "Set Wholesale Price"

### Testing the Integration
1. Make sure your app is running (http://localhost:3000)
2. In your Shopify store:
   - Regular visitors see retail prices
   - Customers marked as "wholesale" see wholesale prices when logged in
   - Wholesale customers get a green "Wholesale Price" badge

## Important Notes

- **Product IDs**: You can find these in your Shopify admin → Products → select a product → the ID is in the URL
- **Customer Emails**: Must match exactly what customers use to log in to your store
- **App Must Be Running**: The app needs to be running for wholesale pricing to work

## Example Usage

1. Add customer: `john@company.com`
2. Set wholesale price for Product ID `123456789`: `$35.00`
3. When John logs in, he sees $35.00 instead of retail price

## Troubleshooting

- **Prices not updating?** Check if the app is running on http://localhost:3000
- **Customer not seeing wholesale prices?** Verify the email matches exactly
- **No products showing wholesale prices?** Make sure you've set wholesale prices for those specific Product IDs

## Next Steps for Production

1. Deploy the app to a hosting service (Heroku, Railway, etc.)
2. Update the app URL in the theme code
3. Consider using a database instead of in-memory storage
4. Add authentication for the admin interface