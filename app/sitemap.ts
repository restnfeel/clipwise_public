import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return ["/", "/blog", "/login", "/terms", "/privacy"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
