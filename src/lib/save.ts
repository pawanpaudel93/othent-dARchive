import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import type { Buffer } from 'node:buffer'
import { findChrome } from 'find-chrome-bin'
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

  private async getChromeExecutablePath() {
    const { executablePath } = await findChrome({})
    return executablePath
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
    browserExecutablePath,
    url,
    basePath,
    output,
  }: {
    browserArgs: string
    browserExecutablePath: string
    url: string
    basePath: string
    output: string
  }) {
    const command = [
    `--browser-executable-path=${browserExecutablePath}`,
    `--browser-args='${browserArgs}'`,
    url,
    `--output=${output}`,
    `--base-path=${basePath}`,
    `--user-agent=${USER_AGENT}`,
    `--browser-server=${this.browserServer}`,
    ]
    await execFile('./node_modules/single-file-cli/single-file', command)
  }

  public save = async (url: string, folderPath?: string): Promise<SaveReturnType> => {
    try {
      if (!folderPath)
        folderPath = temporaryDirectory()

      await fsPromises.stat(folderPath)

      await this.runBrowser({
        browserArgs:
            '["--no-sandbox", "--window-size=1920,1080", "--start-maximized"]',
        browserExecutablePath: await this.getChromeExecutablePath(),
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