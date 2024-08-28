declare module '@remix-run/router' {
  interface BreadcrumbHandle {
    name?: string;
    parameterName?: string;
  }

  export interface RouteHandle {
    breadcrumb?: BreadcrumbHandle;
  }
}