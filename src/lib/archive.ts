import { SendTransactionBundlrProps, SendTransactionBundlrReturnProps } from "othent"
import { type GetTokenSilentlyVerboseResponse } from '@auth0/auth0-spa-js';
import {APP_NAME, APP_VERSION, MANIFEST_CONTENT_TYPE} from "./constants"
import mime from 'mime-types'
import fsPromises from "fs/promises"
import { createHash } from "crypto";
import { Manifest } from "./types";
import path from 'node:path'
import type { Buffer } from 'node:buffer'
import { execFile } from 'promisify-child-process'
import { temporaryDirectory } from 'tempy'

export interface SaveReturnType {
  status: 'success' | 'error'
  message: string
  webpage: string
  screenshot: string
  title: string
  timestamp: number
}

export interface BrowserlessOptions {
  apiKey: string
  proxyServer?: string
  blockAds?: boolean
  stealth?: boolean
  userDataDir?: string
  keepalive?: number
  windowSize?: string
  ignoreDefaultArgs?: string
  headless?: boolean
  userAgent?: string
  timeout?: number
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'


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
        {data: data as unknown as Buffer, JWT: accessToken.id_token, tags}
    )
    if (response.success) {
        return response.transactionId
    } else {
        return await uploadToBundlr(data, tags, accessToken)
    }
}

export class HtmlScreenshotSaver {
  private browserServer?: string

  constructor(browserlessOptions?: BrowserlessOptions) {
    this.processBrowserless(browserlessOptions)
  }

  private processBrowserless(options?: BrowserlessOptions) {
    if (options?.apiKey)
      this.browserServer = this.constructBrowserlessUrl(options)
  }

  private constructBrowserlessUrl(options: BrowserlessOptions): string {
    const {
      apiKey,
      proxyServer,
      blockAds,
      stealth,
      userDataDir,
      keepalive,
      windowSize,
      ignoreDefaultArgs,
      headless,
      userAgent,
      timeout,
    } = options

    let url = `wss://chrome.browserless.io/?token=${apiKey}`

    if (proxyServer)
      url += `&--proxy-server=${proxyServer}`

    if (blockAds)
      url += '&blockAds'

    if (stealth)
      url += '&stealth'

    if (userDataDir)
      url += `&--user-data-dir=${userDataDir}`

    if (keepalive)
      url += `&keepalive=${keepalive}`

    if (windowSize)
      url += `&--window-size=${windowSize}`

    if (ignoreDefaultArgs)
      url += `&ignoreDefaultArgs=${ignoreDefaultArgs}`

    if (headless !== undefined)
      url += `&headless=${headless}`

    if (timeout)
      url += `&timeout=${timeout}`
    
    if (userAgent)
      url += `&user-agent=${userAgent}`

    return url
  }

  private async readFileAsBuffer(filePath: string): Promise<Buffer> {
    return await fsPromises.readFile(filePath)
  }

  private getErrorMessage(error: unknown): string {
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


  private async runBrowser({
    browserArgs,
    url,
    basePath,
    output,
  }: {
    browserArgs: string
    url: string
    basePath: string
    output: string
  }) {
    const command = [
    `--browser-args='${browserArgs}'`,
    url,
    `--output=${output}`,
    `--base-path=${basePath}`,
    `--user-agent=${USER_AGENT}`,
    `--browser-server=${this.browserServer}`,
    ]
    await execFile("single-file", command)
  }

  public save = async (url: string, folderPath?: string): Promise<SaveReturnType> => {
    try {
      if (!folderPath)
        folderPath = temporaryDirectory()

      await fsPromises.stat(folderPath)

      await this.runBrowser({
        browserArgs: '["--no-sandbox", "--window-size=1920,1080", "--start-maximized"]',
        url,
        basePath: folderPath as string,
        output: path.resolve(folderPath, 'index.html'),
      })

      const metadata: {
        title: string
        url: string
      } = JSON.parse(
        (
          await this.readFileAsBuffer(path.join(folderPath, 'metadata.json'))
        ).toString(),
      )
      const timestamp = Math.floor(Date.now() / 1000)

      return {
        status: 'success',
        message: '',
        webpage: path.join(folderPath, 'index.html'),
        screenshot: path.join(folderPath, 'screenshot.png'),
        title: metadata.title,
        timestamp,
      }
    }
    catch (error) {
      if (folderPath)
        await fsPromises.rm(folderPath, { recursive: true, force: true })

      return {
        status: 'error',
        message: this.getErrorMessage(error),
        webpage: '',
        screenshot: '',
        title: '',
        timestamp: 0,
      }
    }
  }
}