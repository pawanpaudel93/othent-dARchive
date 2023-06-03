import { DecodedJWT, Othent, SendTransactionBundlrProps, SendTransactionBundlrReturnProps, SignTransactionBundlrProps, SignTransactionBundlrReturnProps, useOthentReturnProps } from "othent"
import { Auth0Client, createAuth0Client, type GetTokenSilentlyVerboseResponse } from '@auth0/auth0-spa-js';
import jwt_decode from 'jwt-decode';
import { sha256 } from 'crypto-hash';


let othent: useOthentReturnProps;

interface CustomAuthParams {
    [key: string]: any;
}

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

function getTokenSilently(auth0: Auth0Client, authParams: CustomAuthParams) {
    return auth0.getTokenSilently({
        detailedResponse: true,
        cacheMode: "off", 
        authorizationParams: authParams
    })
}

// sign transaction - bundlr
export async function signTransactionBundlr(params: SignTransactionBundlrProps, accessToken: GetTokenSilentlyVerboseResponse): Promise<SignTransactionBundlrReturnProps> {
    params.tags ??= [];

    let uint8Array;

    if (typeof params.data === "string") {
        const encoder = new TextEncoder();
        uint8Array = encoder.encode(params.data);
    } else if (params.data instanceof Uint8Array) {
        uint8Array = params.data;
    } else if (params.data instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(params.data);
    } else if (typeof params.data === "object") {
        uint8Array = new TextEncoder().encode(JSON.stringify(params.data));
    } else {
        throw new TypeError("Unsupported data type");
    }

    const JWT = accessToken.id_token
    const decoded_JWT: DecodedJWT = jwt_decode(JWT)

    if (!decoded_JWT.contract_id) {
        throw new Error(`{success: false, message:"Please create a Othent account"}`)
    }
    return { data: params.data, JWT: accessToken.id_token, tags: params.tags };
}

export async function getAccessToken() {
  const auth0 = await getAuth0Client()

  const file_hash = await sha256(new Uint8Array());

  const authParams = { transaction_input: JSON.stringify({
      othentFunction: "uploadData",
      file_hash: file_hash,
  }) }
  const accessToken = await getTokenSilently(auth0, authParams)
  return accessToken 
}


export async function sendTransactionBundlr(params: SendTransactionBundlrProps): Promise<SendTransactionBundlrReturnProps> {
    const data = params.data;

    const blob = new Blob([data]);

    const formData = new FormData();

    formData.append("file", blob);
    formData.append("dataHashJWT", params.JWT);
    formData.append("API_ID", process.env.NEXT_PUBLIC_OTHENT_API_ID as string);
    formData.append("tags", JSON.stringify(params.tags));

    try {
      const response = await fetch("https://server.othent.io/upload-data-bundlr", {
        method: "POST",
        body: formData,
      })
      return response.json()
    } catch (error) {
      throw error
    }
}
