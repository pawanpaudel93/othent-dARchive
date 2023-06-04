import { Othent, useOthentReturnProps } from "othent"
import { createAuth0Client } from '@auth0/auth0-spa-js';
import { sha256 } from 'crypto-hash';


let othent: useOthentReturnProps;


export function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as Record<string, unknown>).message === 'string'
  )
    return (error as { message: string }).message

  try {
    return new Error(JSON.stringify(error)).message
  }
  catch {
    return String(error)
  }
}


export async function getOthent(apiid?: string) {
  if (othent) return othent
  othent = await Othent({ API_ID: apiid || process.env.NEXT_PUBLIC_OTHENT_API_ID as string });
  return othent
}

const getAuth0Client = () => createAuth0Client({
  domain: "othent.us.auth0.com",
  clientId: "dyegx4dZj5yOv0v0RkoUsc48CIqaNS6C",
  authorizationParams: {
      redirect_uri: window.location.origin
    }
});

export async function getAccessToken() {
  const auth0 = await getAuth0Client()

  const file_hash = await sha256(new Uint8Array());

  const authParams = { transaction_input: JSON.stringify({
      othentFunction: "uploadData",
      file_hash: file_hash,
  }) }
  const accessToken = await auth0.getTokenSilently({
      detailedResponse: true,
      cacheMode: "off", 
      authorizationParams: authParams
  })
  return accessToken 
}
