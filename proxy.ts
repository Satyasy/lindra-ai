// Next.js 16: proxy.ts menggantikan middleware.ts (export proxy + proxyConfig)
export { auth as proxy } from "@/lib/auth";

export const proxyConfig = {
  matcher: ["/bk/:path*"],
};
