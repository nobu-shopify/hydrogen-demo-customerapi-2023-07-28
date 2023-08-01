# Shopify Customer Account API Hydrogen demo

This code is closely following [Using the Customer Account API with Hydrogen](https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen). Please check it out for step-by-step instructions.

**Requirements:**
Set the following EXTRA env variables in Admin -> Hydrogen channel -> (your_hydrogen_storefront) -> More actions -> Storefront settings -> Environments and variables:
- SHOPIFY_STORE_ID = (your store ID, typically 12-digit number)

# Hydrogen template: Demo Store

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **full-featured setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Tailwind CSS (via PostCSS)
- Full-featured setup of components and routes

## Getting started

**Requirements:**

- Node.js version 16.14.0 or higher

```bash
npm create @shopify/hydrogen@latest -- --template demo-store
```

Remember to update `.env` with your shop's domain and Storefront API token!

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```
