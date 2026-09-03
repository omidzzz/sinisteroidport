import LocaleRedirect from "@/components/layout/LocaleRedirect";
import { getAllPosts } from "@/lib/blog/repository";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function BlogSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LocaleRedirect path={`/blog/${slug}`} />;
}
