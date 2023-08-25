import {json, redirect} from '@shopify/remix-oxygen';
import {Form, useActionData, useLoaderData} from '@remix-run/react';
import {useState} from 'react';

import {getInputStyleClasses} from '~/lib/utils';
import {Link} from '~/components';

export const handle = {
  isPublic: true,
};

export async function loader({context, params}) {

  // TODO: update this section to support Customer Account API?
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.locale ? `${params.locale}/account` : '/account');
  }

  // TODO: Query for this?
  return json({shopName: 'Hydrogen'});
}

export const action = async ({request, context, params}) => {
  return null;
}

const badRequest = (data) => json(data, {status: 400});

export const meta = () => {
  return [{title: 'Login'}];
};

export default function Login() {
  const {shopName} = useLoaderData();
  const actionData = useActionData();

  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl">Sign in.</h1>
        <Form method="post" action="/authorize">
          <button 
            className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full 
            pt-6 pb-8 mt-4 mb-4 space-y-3
            hover:bg-yellow-100 active:bg-yellow-500">
              LOG IN WITH CUSTOMER ACCOUNT API
          </button>
        </Form>
        <Form method="post" action="/logout">
          <button 
            className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full 
            hover:bg-yellow-100 active:bg-yellow-500">
              LOG OUT WITH CUSTOMER ACCOUNT API
          </button>
        </Form>
      </div>
    </div>
  );
}


export function doLogin() {
  return null;  // placeholder
}
