import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useInquiryAttachmentLabels } from "./useInquiryAttachmentLabels";
import { StagedAttachmentPicker } from "./StagedAttachmentPicker";

function Harness() {
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  return (
    <StagedAttachmentPicker
      files={files}
      onFilesChange={setFiles}
      consent={consent}
      onConsentChange={setConsent}
      labels={useInquiryAttachmentLabels()}
    />
  );
}

describe("StagedAttachmentPicker", () => {
  it("keeps file selection disabled until the consent is ticked", async () => {
    render(<Harness />);

    expect(screen.getByTestId("staged-attachment-input")).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByTestId("staged-attachment-input")).toBeEnabled();
  });

  it("lists a chosen PDF and lets the user remove it", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("checkbox"));

    const pdf = new File(["x"], "projekt.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByTestId("staged-attachment-input"), pdf);
    expect(screen.getByText("projekt.pdf")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /projekt\.pdf/ }));
    expect(screen.queryByText("projekt.pdf")).not.toBeInTheDocument();
  });
});
