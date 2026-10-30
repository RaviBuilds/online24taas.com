import Image from 'next/image';
import { parseImageRef } from '@/sanity/lib/image';

interface Props {
  imageRef?: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Fill the (relatively positioned) parent instead of using intrinsic dimensions. */
  fill?: boolean;
}

export function SanityImage({ imageRef, alt, sizes = '100vw', priority, className, fill }: Props) {
  const parsed = imageRef ? parseImageRef(imageRef) : null;
  if (!parsed) return null;
  if (fill) return <Image src={parsed.url} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  return <Image src={parsed.url} alt={alt} width={parsed.width} height={parsed.height} sizes={sizes} priority={priority} className={className} />;
}
