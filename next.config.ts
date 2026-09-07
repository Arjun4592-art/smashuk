import type { NextConfig } from 'next'
import path from 'path'
const nextConfig: NextConfig = {
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
  turbopack: {
    root: path.join(__dirname),
  },
}
export default nextConfig