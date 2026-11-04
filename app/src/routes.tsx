import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { SINGLE_CUSTOMER } from "@/lib/brands";
import { WelcomePage } from "@/pages/welcome";
import { UseCasePage } from "@/pages/use-case";
import { CustomersPage } from "@/pages/customers";
import { CustomerPage } from "@/pages/customer";
import { CustomerPortfolioPage } from "@/pages/customer-portfolio";
import { FinOpsPage } from "@/pages/finops";
import { MethodPage } from "@/pages/method";
import { FeaturesPage } from "@/pages/features";

export interface AppRoute {
  path: string;
  element: ReactElement;
}

export const routes: AppRoute[] = [
  { path: "/", element: <WelcomePage /> },
  { path: "/customers", element: SINGLE_CUSTOMER ? <Navigate to={`/customer/${encodeURIComponent(SINGLE_CUSTOMER)}`} replace /> : <CustomersPage /> },
  { path: "/customer/:account", element: <CustomerPage /> },
  { path: "/customer/:account/portfolio", element: <CustomerPortfolioPage /> },
  { path: "/use-case/:id", element: <UseCasePage /> },
  { path: "/finops", element: <FinOpsPage /> },
  { path: "/method", element: <MethodPage /> },
  { path: "/features", element: <FeaturesPage /> },
];
