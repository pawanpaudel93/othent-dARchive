import { SendTransactionBundlrProps, SendTransactionBundlrReturnProps } from "othent"
import { type GetTokenSilentlyVerboseResponse } from '@auth0/auth0-spa-js';
import {APP_NAME, APP_VERSION, MANIFEST_CONTENT_TYPE} from "./constants"
import mime from 'mime-types'
import fsPromises from "fs/promises"
import { createHash } from "crypto";
import { Manifest } from "./types";


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

export async function prepareManifest(manifest: Manifest, timestamp: number, title: string, url: string, address: string) {
    const manifestData = JSON.stringify(manifest)
    const manifestTags = [
        { name: 'App-Name', value: APP_NAME },
        { name: 'App-Version', value: APP_VERSION },
        { name: 'Content-Type', value: MANIFEST_CONTENT_TYPE },
        { name: 'Title', value: title },
        { name: 'Type', value: 'archive' },
        { name: "Url", value: url },
        { name: 'Timestamp', value: String(timestamp) },
        { name: 'Archiver', value: address },
    ]
    return { manifestData, manifestTags }
}

async function toHash(data: Buffer): Promise<string> {
    const hashBuffer = createHash('sha256').update(data).digest()
    const hashHex = hashBuffer.toString('hex')
    return hashHex
  }

export async function prepareFile(filePath: string, title: string, url:string, timestamp: number, isIndexFile:  boolean) {
    const data = await fsPromises.readFile(filePath)
    const hash = await toHash(data)

    const mimeType = mime.lookup(filePath) || 'application/octet-stream'
    
    const tags = [
        { name: 'App-Name', value: APP_NAME },
        { name: 'App-Version', value: APP_VERSION },
        { name: 'Content-Type', value: mimeType },
        { name: isIndexFile ? 'page:title' : 'screenshot:title', value: title},
        {name: isIndexFile ? 'page:url' : 'screenshot:url', value: url},
        {name: isIndexFile ? 'page:timestamp' : 'screenshot:timestamp', value: String(timestamp)},
        { name: 'File-Hash', value: hash },
    ]
    return { data, tags }
}

export async function uploadToBundlr(data: Buffer | string, tags: any, accessToken: GetTokenSilentlyVerboseResponse ): Promise<string> {
    const response = await sendTransactionBundlr(
        {data: data as unknown as File, JWT: accessToken.id_token, tags}
    )
    if (response.success) {
        return response.transactionId
    } else {
        return await uploadToBundlr(data, tags, accessToken)
    }
}

