import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { INTERNAL_LABEL, MICROSOFT_LOGO, SINGLE_CUSTOMER, brandOf } from "@/lib/brands";

export function CustomerHeader({ name, children }: { name: string; children?: React.ReactNode }) {
  const brand = brandOf(name);
  return (
    <section
      aria-label={`${name} header`}
      className="text-white"
      style={{ background: `linear-gradient(115deg, ${brand.dark} 0%, ${brand.dark} 55%, ${brand.primary} 150%)` }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
        <Link to={SINGLE_CUSTOMER ? "/" : "/customers"} className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> {SINGLE_CUSTOMER ? "Welcome" : "All customers"}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <div className="flex h-16 items-center rounded-xl bg-white px-5 shadow-sm">
            {brand.logo ? (
              <img src={brand.logo} alt={`${name} logo`} className="max-h-10 max-w-[180px] object-contain" />
            ) : (
              <span className="text-xl font-semibold" style={{ color: brand.primary }}>
                {name}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/80">{name === "Internal" ? INTERNAL_LABEL : `${name} × Microsoft`}</p>
            <h1 className="font-[family-name:var(--font-serif)] text-3xl tracking-tight">AI use cases</h1>
          </div>
          {children}
          {MICROSOFT_LOGO && <img src={MICROSOFT_LOGO} alt="Microsoft" className="hidden h-7 rounded bg-white px-2 py-1 lg:block" />}
        </div>
      </div>
    </section>
  );
}
