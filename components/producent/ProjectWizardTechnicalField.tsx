import { Input, Label, Stack } from "@/components/ui";

interface ProjectWizardTechnicalFieldProps {
  id: string;
  label: string;
  hint: string;
  type?: "text" | "number";
  value: string | number | null;
  invalid: boolean;
  errorMessage: string;
  onChange: (value: string | number) => void;
}

export function ProjectWizardTechnicalField({
  id,
  label,
  hint,
  type = "text",
  value,
  invalid,
  errorMessage,
  onChange,
}: ProjectWizardTechnicalFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <Stack gap={1}>
      <Label htmlFor={id} required>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        required
        invalid={invalid}
        aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
        value={value ?? ""}
        onChange={(event) =>
          onChange(type === "number" ? Number(event.target.value) : event.target.value)
        }
      />
      <p id={hintId} className="font-sans text-label uppercase tracking-[0.1em] font-medium text-brand-technical-graphite">
        {hint}
      </p>
      {invalid && (
        <p id={errorId} className="font-sans text-body text-status-blocked">
          {errorMessage}
        </p>
      )}
    </Stack>
  );
}
