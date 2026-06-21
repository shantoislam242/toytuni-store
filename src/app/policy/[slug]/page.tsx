import { StubPage } from "@/components/stub-page";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StubPage title={`Policy: ${slug}`} />;
}
