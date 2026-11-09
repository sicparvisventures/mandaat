import { createRootRoute, createRoute, createRouter, lazyRouteComponent } from "@tanstack/react-router";
import { Shell } from "./components/Shell";
import { PageSkeleton } from "./components/ui";
import { Home } from "./pages/Home";

const root = createRootRoute({ component: Shell });

const home = createRoute({ getParentRoute: () => root, path: "/", component: Home });
const dossiers = createRoute({
  getParentRoute: () => root,
  path: "/dossiers",
  component: lazyRouteComponent(() => import("./pages/Dossiers"), "Dossiers"),
});
const dossier = createRoute({
  getParentRoute: () => root,
  path: "/dossier/$id",
  component: lazyRouteComponent(() => import("./pages/Dossier"), "DossierRoute"),
});
const lobby = createRoute({
  getParentRoute: () => root,
  path: "/lobby",
  component: lazyRouteComponent(() => import("./pages/Lobby"), "Lobby"),
});
const org = createRoute({
  getParentRoute: () => root,
  path: "/lobby/$id",
  component: lazyRouteComponent(() => import("./pages/Lobby"), "OrgRoute"),
});
const follow = createRoute({
  getParentRoute: () => root,
  path: "/volg",
  component: lazyRouteComponent(() => import("./pages/Static"), "Follow"),
});
const sources = createRoute({
  getParentRoute: () => root,
  path: "/bronnen",
  component: lazyRouteComponent(() => import("./pages/Static"), "Sources"),
});

const money = createRoute({
  getParentRoute: () => root,
  path: "/geld",
  component: lazyRouteComponent(() => import("./pages/Money"), "Money"),
});
const recipient = createRoute({
  getParentRoute: () => root,
  path: "/geld/$id",
  component: lazyRouteComponent(() => import("./pages/Money"), "RecipientRoute"),
});

const routeTree = root.addChildren([home, dossiers, dossier, lobby, org, money, recipient, follow, sources]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: PageSkeleton,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
