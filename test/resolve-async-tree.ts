import { Children, cloneElement, isValidElement, type ReactNode } from "react";

function isAsyncFunction(value: unknown): value is (...args: never[]) => Promise<unknown> {
  return typeof value === "function" && value.constructor.name === "AsyncFunction";
}

function isHookCallError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // React 19's real message ("Invalid hook call... dispatcher") only shows up
  // through certain call paths; calling a hook on a null dispatcher outside
  // render can instead surface as a plain TypeError reading the hook off null
  // (e.g. "Cannot read properties of null (reading 'useRef')") — both mean
  // the same thing here: a client component's hook fired outside React's
  // real render.
  return /hook|dispatcher|reading 'use[A-Z]/i.test(message);
}

// Testing Library's render() drives React's CLIENT reconciler, which cannot
// resolve an async function component the way Next's RSC pipeline does —
// only DOM elements render correctly through it once every function
// component in the tree has already been invoked. Awaiting a single
// top-level async Server Component before render() only unwraps ONE level:
// a plain (sync) Server Component's own returned JSX is invisible from the
// outside (it is not exposed via props.children, only by actually calling
// the function), so a sync page/section that itself renders a further async
// component nested inside still breaks.
//
// This walks the tree depth first and, for every user component element
// (async or not), calls it directly to see what it actually returns, then
// recurses into that. A "use client" component that reads a hook (useState,
// useTranslations, …) throws when called this way, outside React's real
// render — that's expected and fine: this codebase never nests a not yet
// resolved async Server Component inside a hook using component's own
// returned JSX (see components/klient/AGENTS.md), so there's nothing further
// to resolve there; the element is left untouched for React's real
// reconciler to render normally. Any other error is a genuine bug and is
// rethrown rather than silently swallowed.
export async function resolveAsyncTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) {
    return Promise.all(node.map((child) => resolveAsyncTree(child)));
  }
  if (!isValidElement(node)) {
    return node;
  }

  const { type, props } = node as { type: unknown; props: Record<string, unknown> };

  if (typeof type === "function") {
    if (isAsyncFunction(type)) {
      const resolved = await (type as (p: unknown) => Promise<ReactNode>)(props);
      return resolveAsyncTree(resolved);
    }
    try {
      const resolved = (type as (p: unknown) => ReactNode)(props);
      return resolveAsyncTree(resolved);
    } catch (error) {
      if (!isHookCallError(error)) throw error;
      // fall through: leave the element for React's real reconciler
    }
  }

  if (props && "children" in props && props.children !== undefined) {
    const resolvedChildren = await resolveAsyncTree(props.children as ReactNode);
    return cloneElement(node, undefined, ...Children.toArray(resolvedChildren));
  }

  return node;
}
