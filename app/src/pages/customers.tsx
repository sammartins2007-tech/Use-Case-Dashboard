import { ConnectorErrorState, LoadingState } from "@/components/states";
import { CustomerLogos } from "@/components/customer-logos";
import { useUseCases } from "@/data/repo";
import { ValueMetrics } from "@/components/value-metrics";

export function CustomersPage() {
  const q = useUseCases();
  return (
    <div id="work" tabIndex={-1} className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-10 outline-none">
      <p className="text-sm text-[#8A6420]">Choose a customer</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif)] text-4xl tracking-tight">Customers</h1>
      <div className="mt-8">
        {q.isLoading ? (
          <LoadingState rows={4} />
        ) : q.isError ? (
          <ConnectorErrorState error={q.error} connector="SharePoint" />
        ) : (
          <>
            <ValueMetrics className="mb-6" useCases={(q.data?.rows ?? []).filter((u) => !u.discarded)} scope="All customers, active use cases" />
            <CustomerLogos useCases={q.data?.rows ?? []} nextToken={q.data?.nextToken} />
          </>
        )}
      </div>
    </div>
  );
}
