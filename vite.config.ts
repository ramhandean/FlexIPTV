import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dns from 'node:dns'
import fs from 'node:fs'
import path from 'node:path'

// Force IPv4 first for DNS resolution to prevent timeouts on Indonesian CDN endpoints
try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

interface LocalProxyRule {
  domains?: string[]
  urlIncludes?: string[]
  referer?: string
  origin?: string
  userAgent?: string
}

let cachedLocalRules: LocalProxyRule[] | null = null
function getLocalProxyRules(): LocalProxyRule[] {
  if (cachedLocalRules !== null) return cachedLocalRules
  try {
    const rulesPath = path.resolve(process.cwd(), 'proxy-rules.local.json')
    if (fs.existsSync(rulesPath)) {
      const content = fs.readFileSync(rulesPath, 'utf-8')
      cachedLocalRules = JSON.parse(content)
      return cachedLocalRules || []
    }
  } catch {
    // File not present or invalid JSON
  }
  cachedLocalRules = []
  return cachedLocalRules
}

function streamProxyPlugin(): Plugin {
  // Allow self-signed or legacy TLS certs on stream servers
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const handleProxy = async (req: any, res: any, next: any) => {
    if (!req.url?.startsWith('/api/proxy')) {
      return next()
    }

    // Handle CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')

    if (req.method === 'OPTIONS') {
      res.statusCode = 200
      res.end()
      return
    }

    try {
      const hostOrigin = `http://${req.headers.host || 'localhost:5173'}`
      const rawUrl = req.url || ''

      // Extract targetUrl reliably without truncating nested query params (e.g. ?ch=mnctv)
      let targetUrl = ''
      let userAgentParam = ''
      let refererParam = ''

      const userAgentMatch = rawUrl.match(/[?&](?:userAgent|user_agent)=([^&]+)/)
      if (userAgentMatch) userAgentParam = decodeURIComponent(userAgentMatch[1])

      const refererMatch = rawUrl.match(/[?&]referer=([^&]+)/)
      if (refererMatch) refererParam = decodeURIComponent(refererMatch[1])

      // Extract value after url=
      const urlIndex = rawUrl.indexOf('url=')
      if (urlIndex !== -1) {
        let rawTarget = rawUrl.substring(urlIndex + 4)
        // Remove trailing proxy params (&userAgent=..., &referer=...)
        rawTarget = rawTarget.replace(/&(?:userAgent|user_agent)=.*/, '').replace(/&referer=.*/, '')
        try {
          targetUrl = decodeURIComponent(rawTarget)
        } catch {
          targetUrl = rawTarget
        }
      }

      if (!targetUrl) {
        const reqUrl = new URL(req.url, hostOrigin)
        const param = reqUrl.searchParams.get('url')
        if (param) targetUrl = decodeURIComponent(param)
      }

      if (!targetUrl) {
        res.statusCode = 400
        res.end('Missing url parameter')
        return
      }

      let domainOrigin = 'http://localhost'
      let defaultReferer = 'http://localhost/'
      let defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

      try {
        const targetObj = new URL(targetUrl)
        domainOrigin = `${targetObj.protocol}//${targetObj.hostname}`
        defaultReferer = `${domainOrigin}/`
        const host = targetObj.hostname.toLowerCase()
        const fullUrl = targetUrl.toLowerCase()

        // Check local override rules if proxy-rules.local.json exists
        const localRules = getLocalProxyRules()
        for (const rule of localRules) {
          const matchDomain = rule.domains && rule.domains.length > 0 && rule.domains.some((d) => host.includes(d.toLowerCase()))
          const matchUrl = rule.urlIncludes && rule.urlIncludes.length > 0 && rule.urlIncludes.some((u) => fullUrl.includes(u.toLowerCase()))

          if (matchDomain || matchUrl) {
            if (rule.referer) defaultReferer = rule.referer
            if (rule.origin) domainOrigin = rule.origin
            if (rule.userAgent) defaultUserAgent = rule.userAgent
            break
          }
        }
      } catch {}

      let effectiveReferer = refererParam || defaultReferer
      let effectiveUserAgent = userAgentParam || defaultUserAgent
      const headers: Record<string, string> = {
        'User-Agent': effectiveUserAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Referer': effectiveReferer,
        'Origin': domainOrigin,
      }

      let response = await fetch(targetUrl, {
        headers,
        redirect: 'manual',
      })

      // Handle HTTP redirects dynamically
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        const redirectLocation = response.headers.get('location')!
        const resolvedRedirect = new URL(redirectLocation, targetUrl).href

        const proxiedRedirect = `${hostOrigin}/api/proxy?url=${encodeURIComponent(resolvedRedirect)}&referer=${encodeURIComponent(effectiveReferer)}${userAgentParam ? `&userAgent=${encodeURIComponent(userAgentParam)}` : ''}`

        res.setHeader('Location', proxiedRedirect)
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        res.statusCode = response.status
        res.end()
        return
      }

      if (!response.ok && response.status !== 206) {
        res.setHeader('Content-Type', 'text/plain')
        res.statusCode = response.status
        res.end(`Failed to fetch target stream (${response.status}): ${response.statusText}`)
        return
      }

      const contentType = response.headers.get('content-type') || ''
      const isM3u8 = targetUrl.toLowerCase().includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u')
      const isMpd = targetUrl.toLowerCase().includes('.mpd') || contentType.includes('dash+xml')

      if (isM3u8) {
        const textContent = await response.text()
        const rewrittenLines = textContent.split(/\r?\n/).map((line) => {
          const trimmed = line.trim()
          if (!trimmed) return line
          if (trimmed.startsWith('#')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
              try {
                const resolvedUri = new URL(uri, targetUrl).href
                const proxyUri = `${hostOrigin}/api/proxy?url=${encodeURIComponent(resolvedUri)}${userAgentParam ? `&userAgent=${encodeURIComponent(userAgentParam)}` : ''}&referer=${encodeURIComponent(effectiveReferer)}`
                return `URI="${proxyUri}"`
              } catch {
                return `URI="${uri}"`
              }
            })
          }
          try {
            const resolved = new URL(trimmed, targetUrl).href
            return `${hostOrigin}/api/proxy?url=${encodeURIComponent(resolved)}${userAgentParam ? `&userAgent=${encodeURIComponent(userAgentParam)}` : ''}&referer=${encodeURIComponent(effectiveReferer)}`
          } catch {
            return line
          }
        })

        const finalM3u = rewrittenLines.join('\n')
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
        res.statusCode = 200
        res.end(finalM3u)
      } else if (isMpd) {
        let xmlContent = await response.text()
        const baseUrlStr = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1)
        const proxyBaseUrl = `${hostOrigin}/api/proxy?url=${encodeURIComponent(baseUrlStr)}${userAgentParam ? `&userAgent=${encodeURIComponent(userAgentParam)}` : ''}&referer=${encodeURIComponent(effectiveReferer)}`

        if (!xmlContent.includes('<BaseURL>') && !xmlContent.includes('<BaseURL ')) {
          xmlContent = xmlContent.replace(/<MPD([^>]*)>/i, `<MPD$1><BaseURL>${proxyBaseUrl}</BaseURL>`)
        }
        res.setHeader('Content-Type', 'application/dash+xml')
        res.statusCode = 200
        res.end(xmlContent)
      } else {
        res.setHeader('Content-Type', contentType || 'video/mp2t')
        if (response.headers.get('content-length')) {
          res.setHeader('Content-Length', response.headers.get('content-length')!)
        }
        res.statusCode = response.status

        if (response.body) {
          const reader = response.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) res.write(value)
          }
        }
        res.end()
      }
    } catch (err: any) {
      console.error('[StreamProxy Error]:', err?.message || err)
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/plain')
        res.statusCode = 502
        res.end(`Proxy error: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  return {
    name: 'iptv-stream-proxy',
    configureServer(server) {
      server.middlewares.use(handleProxy)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleProxy)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), streamProxyPlugin()],
})


