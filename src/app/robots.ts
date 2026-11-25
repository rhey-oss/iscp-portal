import type { MetadataRoute } from "next";

// A portal holding student records should never appear in search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
