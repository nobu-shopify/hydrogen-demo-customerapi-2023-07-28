import {redirect} from '@shopify/remix-oxygen';
export async function action({request, context}) {
  const clientId = context.env.PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID;
  const shopID = context.env.PUBLIC_STOREFRONT_ID;
  const origin = new URL(request.url).origin // In development this would resolve to http://localhost:3000
  const loginUrl = new URL(`https://shopify.com/60539601065/auth/oauth/authorize`); // Authorize Endpoint goes here

  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.append('response_type', 'code');
  loginUrl.searchParams.append('redirect_uri', origin + '/authorize');
  loginUrl.searchParams.set(
    'scope',
    'openid email https://api.customers.com/auth/customer.graphql',
  );

  return redirect(loginUrl.toString(), {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}
export async function loader({context, params}) { return null; }
