import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { generateCollectionMetadata, safeJsonLd } from '@/lib/seo';
import { getAllCollectionHandles, getCollectionConfig } from '@/lib/collections-data';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import ShopClient from '@/app/(website)/shop/ShopClient';
import { CollectionHero, CollectionSeoContent } from './CollectionContent';
import VendorIndex from './VendorIndex';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

export function generateStaticParams() {
  return getAllCollectionHandles().map((handle) => ({ handle }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return generateCollectionMetadata(handle);
}

function generateCollectionSchema(handle: string) {
  const collection = getCollectionConfig(handle)!;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.h1,
    description: collection.metaDescription,
    url: `${SITE_URL}/collections/${handle}`,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL
    },
    ...(collection.faqs?.length
      ? {
          mainEntity: collection.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a
            }
          }))
        }
      : {})
  };
}

export default async function CollectionPage({
  params
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const collection = getCollectionConfig(handle);
  if (!collection) notFound();

  return (
    <div className='min-h-screen bg-white'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(generateCollectionSchema(handle))
        }}
      />
      <CollectionHero collection={collection} />
      <CollectionSeoContent collection={collection} />
      {collection.isVendorIndex ? (
        <VendorIndex />
      ) : (
        <Suspense fallback={<div className='min-h-[50vh] bg-white'><ProductGridSkeleton /></div>}>
          <ShopClient overrides={collection.filters} />
        </Suspense>
      )}
    </div>
  );
}
