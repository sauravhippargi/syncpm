import { BRAND_ICONS, type BrandIconSlug } from "@/lib/brand-icons";

export default function BrandIcon({
  slug,
  className,
}: {
  slug: BrandIconSlug;
  className?: string;
}) {
  const icon = BRAND_ICONS[slug];
  const transform = "transform" in icon ? icon.transform : undefined;
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={icon.title} className={className}>
      <g transform={transform}>
        {icon.paths.map((p) => (
          <path key={p.d} d={p.d} fill={p.fill} />
        ))}
      </g>
    </svg>
  );
}
