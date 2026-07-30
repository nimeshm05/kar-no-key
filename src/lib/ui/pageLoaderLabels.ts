export const PAGE_LOADER_LABELS = {
  creatingLobby: "creating lobby",
  loadingLobby: "loading lobby",
  loadingSearch: "loading search",
  loadingGame: "loading game",
  loadingResults: "loading results",
  leavingLobby: "leaving lobby",
} as const;

export function pageLoaderLabelForRoute(route: string): string {
  if (route === "/" || route.startsWith("/?")) {
    return PAGE_LOADER_LABELS.leavingLobby;
  }
  if (route.startsWith("/search")) {
    return PAGE_LOADER_LABELS.loadingSearch;
  }
  if (route.startsWith("/game")) {
    return PAGE_LOADER_LABELS.loadingGame;
  }
  if (route.startsWith("/results")) {
    return PAGE_LOADER_LABELS.loadingResults;
  }
  return PAGE_LOADER_LABELS.loadingLobby;
}
