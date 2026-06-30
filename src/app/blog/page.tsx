import type { Metadata } from "next";
import { BlogHub } from "@/components/blog/blog-hub";
import { BRAND_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `The Blog — ${BRAND_NAME}`,
  description:
    "Tips on safe, screen-free, Montessori-friendly play for babies and toddlers.",
};

export default function Page() {
  return <BlogHub />;
}
