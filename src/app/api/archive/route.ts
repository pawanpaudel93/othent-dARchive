import { NextResponse } from "next/server";
import { HtmlScreenshotSaver } from "save-html-screenshot";
import { Manifest } from "@/lib/types";
import fsPromises from "fs/promises";
import { prepareFile, prepareManifest, uploadToBundlr } from "@/lib/archive";
import path from "path";

export async function POST(request: Request) {
  let folderPath: string = "";
  try {
    const { url, accessToken, address } = await request.json();

    const saver = new HtmlScreenshotSaver(
      process.env.BROWSERLESS_API_KEY
        ? {
            apiKey: process.env.BROWSERLESS_API_KEY as string,
            windowSize: "1920,1080",
            userAgent:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            timeout: 60000,
          }
        : undefined
    );

    const result = await saver.save(url);

    if (result.status === "success") {
      const manifest: Manifest = {
        manifest: "arweave/paths",
        version: "0.1.0",
        index: {
          path: "index.html",
        },
        paths: {},
      };
      folderPath = result.webpage.replace("index.html", "");
      const files = await fsPromises.readdir(folderPath);

      await Promise.all(
        files
          .filter((file) => !file.includes("metadata.json"))
          .map(async (file) => {
            const filePath = path.join(folderPath, file);
            const isIndexFile = filePath.includes("index.html");
            const { data, tags } = await prepareFile(
              filePath,
              result.title,
              url,
              result.timestamp,
              isIndexFile
            );
            const transactionId = await uploadToBundlr(data, tags, accessToken);
            manifest.paths[isIndexFile ? "index.html" : "screenshot"] = {
              id: transactionId,
            };
          })
      );

      const { manifestData, manifestTags } = await prepareManifest(
        manifest,
        result.timestamp,
        result.title,
        url,
        address
      );

      const transactionId = await uploadToBundlr(
        manifestData,
        manifestTags,
        accessToken
      );

      await fsPromises.rm(folderPath, { recursive: true, force: true });

      let json_response = {
        status: result.status,
        data: {
          txID: transactionId,
          title: result.title,
          timestamp: result.timestamp,
        },
      };
      return new NextResponse(JSON.stringify(json_response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      throw Error(result.message);
    }
  } catch (error: any) {
    if (folderPath) {
      await fsPromises.rm(folderPath, { recursive: true, force: true });
    }
    let error_response = {
      status: "error",
      message: error.message,
    };
    return new NextResponse(JSON.stringify(error_response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
