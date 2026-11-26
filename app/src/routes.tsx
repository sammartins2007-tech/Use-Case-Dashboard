import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { SINGLE_CUSTOMER } from "@/lib/brands";
import { WelcomePage } from "@/pages/welcome";
import { UseCasePage } from "@/pages/use-case";
import { CustomersPage } from "@/pages/customers";
import { CustomerPage } from "@/pages/customer";
import { CustomerPortfolioPage } from "@/pages/customer-portfolio";
import { RoadmapPage } from "@/pages/roadmap";
import { FinOpsPage } from "@/pages/finops";
import { MethodPage } from "@/pages/method";
import { FeaturesPage } from "@/pages/features";
import { SolutionPage } from "@/pages/solution";
import { WavePlanPage } from "@/pages/wave-plan";
import { StoryPage } from "@/pages/story";
import { BacklogPage } from "@/pages/backlog";

export interface AppRoute {
  path: string;
  element: ReactElement;
}

export const routes: AppRoute[] = [
  { path: "/", element: <WelcomePage /> },
  { path: "/customers", element: SINGLE_CUSTOMER ? <Navigate to={`/customer/${encodeURIComponent(SINGLE_CUSTOMER)}`} replace /> : <CustomersPage /> },
  { path: "/customer/:account", element: <CustomerPage /> },
  { path: "/customer/:account/portfolio", element: <CustomerPortfolioPage /> },
  { path: "/customer/:account/roadmap", element: <RoadmapPage /> },
  { path: "/use-case/:id", element: <UseCasePage /> },
  { path: "/use-case/:id/solution", element: <SolutionPage /> },
  { path: "/customer/:account/wave/:wave", element: <WavePlanPage /> },
  { path: "/finops", element: <FinOpsPage /> },
  { path: "/method", element: <MethodPage /> },
  { path: "/story", element: <StoryPage /> },
  { path: "/backlog", element: <BacklogPage /> },
  { path: "/features", element: <FeaturesPage /> },
];
