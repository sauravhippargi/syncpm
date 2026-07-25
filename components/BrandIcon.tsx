import { BRAND_ICONS, type BrandIconSlug } from "@/lib/brand-icons";

export default function BrandIcon({
  slug,
  className,
}: {
  slug: BrandIconSlug;
  className?: string;
}) {
  const icon = BRAND_ICONS[slug];
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={icon.title}
      className={className}
      fill={icon.hex}
    >
      <path d={icon.path} />
    </svg>
  );
}
