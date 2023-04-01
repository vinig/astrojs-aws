import { App } from "astro/app"
import {
  CloudFrontHeaders,
  CloudFrontRequestHandler,
  CloudFrontRequestResult,
} from "aws-lambda"

export default function handler(
  app: App,
  knownBinaryMediaTypes: Set<string>,
): CloudFrontRequestHandler {
  return async function (event): Promise<CloudFrontRequestResult> {
    if (event.Records.length == 0 || event.Records.length > 1) {
      throw new Error(
        "Illegal record size, cloudfront event records equal 0 or greater than 1",
      )
    }

    const { uri, method, headers, querystring, body } =
      event.Records[0].cf.request

    // convert aws cloudfront event to node request
    const requestHeaders = new Headers()
    for (const [key, values] of Object.entries(headers)) {
      for (const { value } of values) {
        if (value) {
          requestHeaders.append(key, value)
        }
      }
    }
    const host = (headers["x-forwarded-host"] || headers["host"])[0].value
    const qs = querystring.length > 0 ? `?${querystring}` : ""
    const url = new URL(`${uri}${qs}`, `https://${host}`)
    const request = new Request(url.toString(), {
      method,
      headers: requestHeaders,
      body: body?.data
        ? body.encoding === "base64"
          ? Buffer.from(body.data, "base64").toString()
          : body.data
        : undefined,
    })

    // astro render
    const rendered = await app.render(request)

    // build cookies
    const responseHeaders: CloudFrontHeaders = {}
    const rawHeaders = rendered.headers.entries()
    for (const [key, value] of rawHeaders) {
      for (const v of value) {
        responseHeaders[key] = [
          ...(responseHeaders[key] || []),
          { key, value: v },
        ]
      }
    }

    // convert node response to cloudfront response
    const contentType = rendered.headers.get("content-type") ?? ""
    const responseIsBase64Encoded = knownBinaryMediaTypes.has(contentType)
    return {
      status: rendered.status.toString(),
      statusDescription: "OK",
      headers: responseHeaders,
      bodyEncoding: responseIsBase64Encoded ? "base64" : "text",
      body: await rendered.text(),
    }
  }
}
