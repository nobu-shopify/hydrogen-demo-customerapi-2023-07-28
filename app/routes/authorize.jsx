import {redirect} from '@shopify/remix-oxygen';
import {HydrogenSession} from 'server';

export async function action({request, context}) {
  const clientId = context.env.PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID;
  const shopID = context.env.PUBLIC_STOREFRONT_ID;
  const shopifyStoreID = context.env.SHOPIFY_STORE_ID;
  const origin = new URL(request.url).origin // In development this would resolve to http://localhost:3000
  const loginUrl = new URL(`https://shopify.com/${shopifyStoreID}/auth/oauth/authorize`); // Authorize Endpoint goes here
  
  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.append('response_type', 'code');
  loginUrl.searchParams.append('redirect_uri', origin + '/authorize');
  loginUrl.searchParams.set(
    'scope',
    'openid email https://api.customers.com/auth/customer.graphql',
  );

  // Verifier, challenge
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  context.session.set('code-verifier', verifier);

  loginUrl.searchParams.append('code_challenge', challenge);
  loginUrl.searchParams.append('code_challenge_method', 'S256');

  // State, nonce
  const state = await generateRandomString()
  const nonce = await generateRandomString()  

  context.session.set('state', state)
  context.session.set('nonce', nonce)

  loginUrl.searchParams.append('state', state);
  loginUrl.searchParams.append('nonce', nonce);


  return redirect(loginUrl.toString(), {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}
export async function loader({request, context}) { 
  const code = new URL(request.url).searchParams.get('code');
  const state = new URL(request.url).searchParams.get('state');

  if (!code) throw new Response("No Code", { status: 400})
  if (state != context.session.get('state')) throw new Response("State does not match", { status: 400})

  const shopifyStoreID = context.env.SHOPIFY_STORE_ID;
  const clientId = context.env.PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID;
  const origin = new URL(request.url).origin  // In development this would resolve to http://localhost:3000 or an oxygen generated host

  const body = new URLSearchParams();

  body.append('grant_type', 'authorization_code');
  body.append('client_id', clientId);
  body.append('redirect_uri', `${origin}/authorize`);
  body.append('code', code);

  const codeVerifier = context.session.get('code-verifier');
  body.append('code_verifier', codeVerifier);

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

  const headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'User-Agent': userAgent,
    Origin: origin,
  };

  const tokenRequestUrl = `https://shopify.com/${shopifyStoreID}/auth/oauth/token` // Token endpoint

  const response = await fetch(tokenRequestUrl, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    throw new Response(await response.text(), {
      status: response.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  const {access_token, expires_in, id_token, refresh_token} =
    await response.json();

  const nonce = getNonce(id_token)

  if (nonce != context.session.get('nonce')) throw new Response("Nonce does not match", { status: 400})

  context.session.set('customer_authorization_code_token', access_token);
  context.session.set('expires_in', expires_in);
  context.session.set('id_token', id_token);
  context.session.set('refresh_token', refresh_token);

  // Customer access token
  const customerAccessToken = await exchangeAccessToken(
    context.session,
    clientId,
    origin,
    context,
  );

  context.session.set('customer_access_token', customerAccessToken);

  return redirect('/', {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  });
}

export async function generateCodeVerifier() {
  const rando = generateRandomCode();
  return base64UrlEncode(rando);
}

export async function generateCodeChallenge(codeVerifier) {
  const digestOp = await crypto.subtle.digest(
    {name: 'SHA-256'},
    new TextEncoder().encode(codeVerifier),
  );
  const hash = convertBufferToString(digestOp);
  return base64UrlEncode(hash);
}

function generateRandomCode() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return String.fromCharCode.apply(null, Array.from(array));
}

function base64UrlEncode(str) {
  const base64 = btoa(str);
  // This is to ensure that the encoding does not have +, /, or = characters in it.
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function convertBufferToString(hash) {
  const uintArray = new Uint8Array(hash);
  const numberArray = Array.from(uintArray);
  return String.fromCharCode(...numberArray);
}

export async function generateRandomString() {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2);
  return timestamp + randomString;
}

function getNonce(token) {
  return decodeJwt(token).payload.nonce;
}

function decodeJwt(token) {
  const [header, payload, signature] = token.split('.');

  const decodedHeader = JSON.parse(atob(header));
  const decodedPayload = JSON.parse(atob(payload));

  return {
    header: decodedHeader,
    payload: decodedPayload,
    signature,
  };
}

async function exchangeAccessToken(
  session,
  customerAccountId,
  origin,
  context
) {
  const clientId = customerAccountId;
  const customerApiClientId = '30243aa5-17c1-465a-8493-944bcc4e88aa';
  const accessToken = session.get('customer_authorization_code_token');
  const body = new URLSearchParams();
  const shopifyStoreID = context.env.SHOPIFY_STORE_ID;

  body.append('grant_type', 'urn:ietf:params:oauth:grant-type:token-exchange');
  body.append('client_id', clientId);
  body.append('audience', customerApiClientId);
  body.append('subject_token', accessToken);
  body.append(
    'subject_token_type',
    'urn:ietf:params:oauth:token-type:access_token',
  );
  body.append('scopes', 'https://api.customers.com/auth/customer.graphql');

  console.log('body', body);

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

  const headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'User-Agent': userAgent,
    Origin: origin,
  };

  console.log('headers', headers);

  // Token Endpoint goes here
  const response = await fetch(`https://shopify.com/${shopifyStoreID}/auth/oauth/token`, {
    method: 'POST',
    headers,
    body,
  });

  console.log('response', JSON.stringify(response));
//  console.log('response', response);

  const data = await response.json();
  if (data.error) {
    throw new Response(data.error_description, {status: 400});
  }
  console.log('access_token', data.access_token);
  return data.access_token;
}
