import Image from "next/image";

export type BrandDisplay = "logo" | "name" | "both";

export function brandDisplay(value: string | undefined): BrandDisplay {
  if (value === "logo" || value === "name" || value === "both") return value;
  return "both";
}

export default function Logo({
  name,
  logo,
  display = "both",
  className = "",
  size = "nav",
}: {
  name: string;
  logo: string;
  display?: BrandDisplay;
  className?: string;
  size?: "nav" | "footer";
}) {
  const mode = brandDisplay(display);
  const showLogo = mode === "logo" || mode === "both";
  const showName = mode === "name" || mode === "both";
  const imageStyle =
    size === "footer"
      ? { height: "calc(2.65rem * 1.1)", width: "calc(2.65rem * 1.1 * 270 / 91)" }
      : {
          height: "calc(2.5rem * 1.21275)",
          width: "calc(2.5rem * 270 / 91 * 1.4641)",
        };

  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      {showLogo ? (
        <Image
          src={logo}
          alt={showName ? "" : name}
          width={270}
          height={91}
          unoptimized
          className="max-w-none"
          style={imageStyle}
        />
      ) : null}
      {showName ? <span>{name}</span> : null}
    </span>
  );
}
