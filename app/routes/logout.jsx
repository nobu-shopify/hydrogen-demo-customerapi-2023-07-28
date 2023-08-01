import {redirect} from '@shopify/remix-oxygen';
export async function action({context}) {
  const shopifyStoreID = context.env.SHOPIFY_STORE_ID;
  const id_token = context.session.get('id_token');

  context.session.unset('customer_access_token');
  context.session.unset('customer_authorization_code_token');
  context.session.unset('expires_in');
  context.session.unset('id_token');
  context.session.unset('refresh_token');

  // Logout Endpoint
  return redirect(`https://shopify.com/${shopifyStoreID}/auth/logout?id_token_hint=${id_token}`, {
    status: 302,
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}