import type { MetadataRoute } from "next";

/* One page. There is nothing else to list, because there is nothing stored. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://killmyidea.onedaybuilt.com", changeFrequency: "monthly", priority: 1 }];
}
