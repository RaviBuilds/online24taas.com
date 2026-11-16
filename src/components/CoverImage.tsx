import Image from 'next/image';
import { parseImageRef } from '@/sanity/lib/image';

interface Props {
  imageRef?: string | null;
  alt?: string;
  /** Target box ratio (w / h). The parent must be `relative` with this aspect ratio or an explicit size. */
  ratio: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Fills its parent. Images whose ratio is close to the box are cropped with object-cover. Very wide banners,
 * tall posters and text graphics are shown whole (object-contain) on top of a blurred, enlarged copy of
 * themselves, so baked-in text is never cut off and the box still looks full.
 */
export function CoverImage({ imageRef, alt = '', ratio, sizes, priority, className = '' }: Props) {
  const parsed = imageRef ? parseImageRef(imageRef) : null;
  if (!parsed) return <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,#2a2522,#14110f)]" />;
  const r = parsed.width / parsed.height / ratio;
  const fits = r >= 0.8 && r <= 1.25;
  if (fits) {
    return <Image src={parsed.url} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
  }
  return (
    <>
      <Image src={parsed.url} alt="" aria-hidden fill sizes="64px" className="scale-125 object-cover blur-2xl saturate-125" />
      <div aria-hidden className="absolute inset-0 bg-black/20" />
      <Image src={parsed.url} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${className}`} />
    </>
  );
}
