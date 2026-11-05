import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { INTERNAL_LABEL, MICROSOFT_LOGO, SINGLE_CUSTOMER, brandOf } from "@/lib/brands";
import { safeUrl } from "@/lib/safe-url";

export function CustomerHeader({ name, children }: { name: string; children?: React.ReactNode }) {
  const brand = brandOf(name);
  const id = brand.identity;
  const accents = id?.accents?.length ? [brand.primary, ...id.accents] : [];
  const site = safeUrl(id?.website);

  if (!id)
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

  return (
    <section aria-label={`${name} header`} className="relative isolate overflow-hidden text-white">
      {id.hero && <img src={id.hero} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: `linear-gradient(100deg, ${brand.dark} 0%, ${brand.dark}F2 38%, ${brand.dark}99 62%, ${brand.dark}10 100%)` }}
      />
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-5 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={SINGLE_CUSTOMER ? "/" : "/customers"} className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden="true" /> {SINGLE_CUSTOMER ? "Welcome" : "All customers"}
          </Link>
          <span className="flex items-center gap-2 text-xs text-white/75">
            {name} × Microsoft
            {MICROSOFT_LOGO && <img src={MICROSOFT_LOGO} alt="Microsoft" className="h-6 rounded bg-white px-1.5 py-0.5" />}
          </span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-14 items-center rounded-xl bg-white px-5 shadow-sm">
                {brand.logo ? (
                  <img src={brand.logo} alt={`${name} logo`} className="max-h-9 max-w-[170px] object-contain" />
                ) : (
                  <span className="text-xl font-semibold" style={{ color: brand.primary }}>
                    {name}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">AI use cases</h1>
            </div>
            {id.purpose && (
              <p className="mt-4 max-w-2xl text-xl leading-snug md:text-2xl">
                <span className="font-light">“</span>
                {id.purpose}
                <span className="font-light">”</span>
              </p>
            )}
            {id.about && <p className="mt-2 max-w-2xl text-sm text-white/80">{id.about}</p>}
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-white/75 underline-offset-2 hover:text-white hover:underline">
                {site.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {children}
            {id.facts && id.facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {id.facts.map((f) => (
                  <div key={f.label} className="rounded-xl bg-white/12 px-3 py-2 backdrop-blur-sm ring-1 ring-white/20">
                    <dd className="text-xl font-semibold tabular-nums">{f.value}</dd>
                    <dt className="text-[11px] text-white/80">{f.label}</dt>
                  </div>
                ))}
              </dl>
            )}
            {id.factsNote && <p className="text-[10px] text-white/60">{id.factsNote}</p>}
          </div>
        </div>
      </div>
      {accents.length > 0 && (
        <div className="flex h-1.5" aria-hidden="true">
          {accents.map((c, i) => (
            <span key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
      )}
    </section>
  );
}
