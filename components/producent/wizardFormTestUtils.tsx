import type { ReactNode } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import type { ProjectDraft } from "@/lib/data/types";

interface WizardFormHarnessProps {
  defaultValues: ProjectDraft;
  onFormReady?: (form: UseFormReturn<ProjectDraft>) => void;
  children: ReactNode;
}

// Wspólny test harness dla kroków kreatora zmigrowanych na react-hook-form
// (spec 0045 AC-14): odtwarza FormProvider, którego w produkcji dostarcza
// ProjectWizard/ProductEditWizard, żeby testować krok w izolacji bez
// renderowania całego kreatora. `onFormReady` wystawia instancję formularza
// do asercji (`form.getValues()`) zamiast dawnego `onChange` mocka.
export function WizardFormHarness({ defaultValues, onFormReady, children }: WizardFormHarnessProps) {
  const form = useForm<ProjectDraft>({ defaultValues });
  onFormReady?.(form);
  return <FormProvider {...form}>{children}</FormProvider>;
}
