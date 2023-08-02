import {defer} from '@shopify/remix-oxygen';
import {Suspense} from 'react';
import {Await, useLoaderData, Form} from '@remix-run/react';
import {AnalyticsPageType} from '@shopify/hydrogen';

import {ProductSwimlane, FeaturedCollections, Hero} from '~/components';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {getHeroPlaceholder} from '~/lib/placeholders';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';

export const headers = routeHeaders;

export async function loader({params, context, request}) {
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are on `EN-US`
    // the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

  const {shop, hero} = await context.storefront.query(HOMEPAGE_SEO_QUERY, {
    variables: {handle: 'freestyle'},
  });

  const seo = seoPayload.home();

  // Customer Account API
  // Check login status, refresh access token if needed
  const loggedIn = await isLoggedIn(context, request);

  let user = null;
  if (loggedIn) {
    /** TODO: find a way to make cart association work
    // Associate customer to the cart
    const cart = context.cart;
    const customerAccessToken = context.session.get('customer_access_token'); 
    console.log('cart', cart);
    console.log('customerAccessToken', customerAccessToken);

    // Sync customerAccessToken with existing cart
    const result = await cart.updateBuyerIdentity({customerAccessToken});
    console.log('buyerIdentityResult', result)

    // Update cart id in cookie
    const headers = cart.setCartId(result.cart.id);

    headers.append('Set-Cookie', await session.commit());
    */

    // Extract customer info from Customer Account API
    const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';
    const origin = new URL(request.url).origin // Will be http://localhost:3000 in development or an oxygen generated host
  
    const query = `query customer {
        personalAccount {
          email
          creationDate
          firstName
          lastName
          tags
        }
      }`
    const variables = {}
    const accessToken = context.session.get('customer_access_token');
    console.log('accessToken', accessToken);
    
    user = await fetch(
      `https://shopify.com/${context.env.SHOPIFY_STORE_ID}/account/customer/api/${context.env.CUSTOMER_API_VERSION}/graphql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          Origin: origin,
          Authorization: accessToken,
        },
        body: JSON.stringify({
          operationName: 'SomeQuery',
          query,
          variables: variables,
        }),
      },
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `${response.status} (RequestID ${response.headers.get(
              'x-request-id',
            )}): ${await response.text()}`,
          );
        }
        return (await response.json()).data;
      });  
  }
//  console.log('user', user);

  return defer({
    shop,
    // User info from Customer Account API
    userData: user,
    primaryHero: hero,
    // These different queries are separated to illustrate how 3rd party content
    // fetching can be optimized for both above and below the fold.
    featuredProducts: context.storefront.query(
      HOMEPAGE_FEATURED_PRODUCTS_QUERY,
      {
        variables: {
          /**
           * Country and language properties are automatically injected
           * into all queries. Passing them is unnecessary unless you
           * want to override them from the following default:
           */
          country,
          language,
        },
      },
    ),
    secondaryHero: context.storefront.query(COLLECTION_HERO_QUERY, {
      variables: {
        handle: 'backcountry',
        country,
        language,
      },
    }),
    featuredCollections: context.storefront.query(FEATURED_COLLECTIONS_QUERY, {
      variables: {
        country,
        language,
      },
    }),
    tertiaryHero: context.storefront.query(COLLECTION_HERO_QUERY, {
      variables: {
        handle: 'winter-2022',
        country,
        language,
      },
    }),
    analytics: {
      pageType: AnalyticsPageType.home,
    },
    seo,
  });
}

export default function Homepage() {
  const {
    userData,
    primaryHero,
    secondaryHero,
    tertiaryHero,
    featuredCollections,
    featuredProducts,
  } = useLoaderData();

  // TODO: skeletons vs placeholders
  const skeletons = getHeroPlaceholder([{}, {}, {}]);

  return (
    <>
      {userData && (
        <Suspense>
          <div>
            <b> Welcome {userData.personalAccount.firstName} {userData.personalAccount.lastName}</b>
            <p> ... member since {userData.personalAccount.creationDate} </p>
            <p> ... email {userData.personalAccount.email} </p>
            <p> ... tags {userData.personalAccount.tags} </p>
          </div>
        </Suspense>
      )}

      {userData && (
        <div>
          <Form method="post" action="/logout">
            <button
              className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full 
              hover:bg-yellow-100 active:bg-yellow-500">
                Logout
            </button>
          </Form>
        </div>
      )}



      {primaryHero && (
        <Hero {...primaryHero} height="full" top loading="eager" />
      )}

      {featuredProducts && (
        <Suspense>
          <Await resolve={featuredProducts}>
            {({products}) => {
              if (!products?.nodes) return <></>;
              return (
                <ProductSwimlane
                  products={products}
                  title="Featured Products"
                  count={4}
                />
              );
            }}
          </Await>
        </Suspense>
      )}

      {secondaryHero && (
        <Suspense fallback={<Hero {...skeletons[1]} />}>
          <Await resolve={secondaryHero}>
            {({hero}) => {
              if (!hero) return <></>;
              return <Hero {...hero} />;
            }}
          </Await>
        </Suspense>
      )}

      {featuredCollections && (
        <Suspense>
          <Await resolve={featuredCollections}>
            {({collections}) => {
              if (!collections?.nodes) return <></>;
              return (
                <FeaturedCollections
                  collections={collections}
                  title="Collections"
                />
              );
            }}
          </Await>
        </Suspense>
      )}

      {tertiaryHero && (
        <Suspense fallback={<Hero {...skeletons[2]} />}>
          <Await resolve={tertiaryHero}>
            {({hero}) => {
              if (!hero) return <></>;
              return <Hero {...hero} />;
            }}
          </Await>
        </Suspense>
      )}
    </>
  );
}

async function refreshToken(
  session,
  customerAccountId,
  origin,
  context,
) {
  const body = new URLSearchParams();
  const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

  body.append('grant_type', 'refresh_token');
  body.append('refresh_token', session.get('refresh_token'));
  body.append('client_id', customerAccountId);
//  console.log('body', body);

  const headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'User-Agent': userAgent,
    Origin: origin,
  };
//  console.log('headers', headers);

  const shopifyStoreID = context.env.SHOPIFY_STORE_ID;
  const response = await fetch(`https://shopify.com/${shopifyStoreID}/auth/oauth/token`, {
    method: 'POST',
    headers,
    body: body,
  });

  console.log('response', JSON.stringify(response));

  if (!response.ok) {
    const text = await response.text();
    throw new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  const {access_token, expires_in, id_token, refresh_token} =
    await response.json();

  // Store the date in future the token expires, separated by two minutes
  session.set(
    'expires_at',
    new Date(new Date().getTime() + (expires_in - 120) * 1000).getTime(),
  );
  session.set('customer_authorization_code_token', access_token);
  session.set('expires_in', expires_in);  // TODO: DEBUG - this line does not exist in the original code
  session.set('id_token', id_token);      // TODO: DEBUG - trying to refresh token in 2 min id_token was undefined
  session.set('refresh_token', refresh_token);

  const customerAccessToken = await exchangeAccessToken(
    session,
    customerAccountId,
    origin,
    context,
  );

  session.set('customer_access_token', customerAccessToken);
  console.log('Token updated');
}
async function isLoggedIn(context, request) {
  const session = context.session;
  const clientId = context.env.PUBLIC_CUSTOMER_ACCOUNT_CLIENT_ID;

  if (!session.get('customer_access_token')) return false;
  const origin = new URL(request.url).origin

  console.log('token expires in', (session.get('expires_at') - (new Date().getTime()))/1000);
  if (session.get('expires_at') < new Date().getTime()) {
    console.log('Refreshing token');
    try {
      await refreshToken(
        session,
        clientId,
        origin,
        context,
      );

      return true;
    } catch (error) {
      if (error && error.status !== 401) {
        throw error;
      }
    }
  } else {
    return true;
  }

  console.log('Refresh token error!!');
  session.unset('code-verifier');
  session.unset('customer_authorization_code_token');
  session.unset('expires_at');
  session.unset('id_token');
  session.unset('refresh_token');
  session.unset('customer_access_token');

  return false;
}
// Bring in from /routes/authorize.jsx
async function exchangeAccessToken(
  session,
  customerAccountId,
  origin,
  context,
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

//  console.log('body', body);

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

  const headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'User-Agent': userAgent,
    Origin: origin,
  };

//  console.log('headers', headers);

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
//  console.log('access_token', data.access_token);
  return data.access_token;
}


const COLLECTION_CONTENT_FRAGMENT = `#graphql
  fragment CollectionContent on Collection {
    id
    handle
    title
    descriptionHtml
    heading: metafield(namespace: "hero", key: "title") {
      value
    }
    byline: metafield(namespace: "hero", key: "byline") {
      value
    }
    cta: metafield(namespace: "hero", key: "cta") {
      value
    }
    spread: metafield(namespace: "hero", key: "spread") {
      reference {
        ...Media
      }
    }
    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {
      reference {
        ...Media
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

const HOMEPAGE_SEO_QUERY = `#graphql
  query seoCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
    shop {
      name
      description
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
`;

const COLLECTION_HERO_QUERY = `#graphql
  query heroCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
`;

// @see: https://shopify.dev/api/storefront/2023-07/queries/products
export const HOMEPAGE_FEATURED_PRODUCTS_QUERY = `#graphql
  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

// @see: https://shopify.dev/api/storefront/2023-07/queries/collections
export const FEATURED_COLLECTIONS_QUERY = `#graphql
  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(
      first: 4,
      sortKey: UPDATED_AT
    ) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
  }
`;

