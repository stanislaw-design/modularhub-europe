// Must render before any other focusable element on the page (header nav
// included) so it is the first Tab stop, per WCAG 2.2 AA bypass-blocks.
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-brand-2 focus:top-brand-2 focus:z-50 focus:rounded-data focus:bg-brand-passage-blue focus:px-brand-2 focus:py-brand-1 focus:text-body focus:text-brand-action-foreground"
    >
      Przejdź do treści
    </a>
  );
}
