import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MockUploadedFile } from "@/lib/data/types";
import { FileUpload } from "./FileUpload";

function makeFile(name: string, sizeBytes: number, content = "x"): File {
  const file = new File([content], name);
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("FileUpload", () => {
  it("shows the empty state when no files are selected yet", () => {
    render(<FileUpload id="rzuty" label="Rzuty" files={[]} onFilesChange={vi.fn()} />);

    expect(screen.getByText("Nie wybrano jeszcze żadnego pliku.")).toBeInTheDocument();
  });

  it("always shows the mock disclaimer, since no file is ever really saved", () => {
    render(<FileUpload id="rzuty" label="Rzuty" files={[]} onFilesChange={vi.fn()} />);

    expect(screen.getByText(/pliki nie są nigdzie zapisywane ani wysyłane/i)).toBeInTheDocument();
  });

  it("lists a selected file's name and a human readable size", () => {
    render(
      <FileUpload
        id="rzuty"
        label="Rzuty"
        files={[{ name: "rzut-parter.pdf", sizeBytes: 2048 }]}
        onFilesChange={vi.fn()}
      />
    );

    expect(screen.getByText("rzut-parter.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("calls onFilesChange with name and size only, never the file content, when a file is picked", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(<FileUpload id="rzuty" label="Rzuty" files={[]} onFilesChange={onFilesChange} />);

    const input = document.getElementById("rzuty") as HTMLInputElement;
    await user.upload(input, makeFile("rzut-parter.pdf", 512));

    expect(onFilesChange).toHaveBeenCalledWith([{ name: "rzut-parter.pdf", sizeBytes: 512 }]);
  });

  it("appends newly picked files to the existing list rather than replacing it", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    const existing: MockUploadedFile[] = [{ name: "rzut-parter.pdf", sizeBytes: 512 }];
    render(<FileUpload id="rzuty" label="Rzuty" files={existing} onFilesChange={onFilesChange} />);

    const input = document.getElementById("rzuty") as HTMLInputElement;
    await user.upload(input, makeFile("rzut-pietro.pdf", 256));

    expect(onFilesChange).toHaveBeenCalledWith([
      { name: "rzut-parter.pdf", sizeBytes: 512 },
      { name: "rzut-pietro.pdf", sizeBytes: 256 },
    ]);
  });

  it("can hand real File objects to a secure upload flow without changing mock consumers", async () => {
    const user = userEvent.setup();
    const onNativeFilesChange = vi.fn();
    render(
      <FileUpload
        id="pdf"
        label="PDF"
        files={[]}
        onFilesChange={vi.fn()}
        nativeFiles={[]}
        onNativeFilesChange={onNativeFilesChange}
        notice="Plik zostanie wysłany po zatwierdzeniu."
      />,
    );

    const selected = makeFile("offer.pdf", 512, "%PDF-1.7");
    await user.upload(document.getElementById("pdf") as HTMLInputElement, selected);

    expect(onNativeFilesChange).toHaveBeenCalledWith([selected]);
    expect(screen.getByText("Plik zostanie wysłany po zatwierdzeniu.")).toBeInTheDocument();
  });

  it("removes only the clicked file, keeping the rest, via its named remove button", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(
      <FileUpload
        id="rzuty"
        label="Rzuty"
        files={[
          { name: "rzut-parter.pdf", sizeBytes: 512 },
          { name: "rzut-pietro.pdf", sizeBytes: 256 },
        ]}
        onFilesChange={onFilesChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Usuń plik rzut-parter.pdf" }));

    expect(onFilesChange).toHaveBeenCalledWith([{ name: "rzut-pietro.pdf", sizeBytes: 256 }]);
  });

  it("shows the required marker on the label when asked", () => {
    render(<FileUpload id="rzuty" label="Rzuty" files={[]} onFilesChange={vi.fn()} required />);

    const label = document.querySelector("label[for='rzuty']");
    expect(label).toHaveTextContent("*");
  });

  it("omits the required marker when not asked", () => {
    render(<FileUpload id="rzuty" label="Rzuty" files={[]} onFilesChange={vi.fn()} />);

    const label = document.querySelector("label[for='rzuty']");
    expect(label).not.toHaveTextContent("*");
  });
});
