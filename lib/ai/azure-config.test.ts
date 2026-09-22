import { describe, expect, it } from "vitest";
import { AzureAiConfigurationError, getAzureAiConfig } from "./azure-config";

const validEnvironment = {
  AZURE_OPENAI_ENDPOINT: "https://openai.example.com/",
  AZURE_OPENAI_DEPLOYMENT: "gpt-5-mini-dev",
  AZURE_OPENAI_MODEL_SNAPSHOT: "2025-08-07",
};

describe("getAzureAiConfig", () => {
  it("normalizes endpoints and returns the pinned deployment", () => {
    expect(getAzureAiConfig(validEnvironment)).toEqual({
      openAiEndpoint: "https://openai.example.com",
      openAiDeployment: "gpt-5-mini-dev",
      openAiModelSnapshot: "2025-08-07",
    });
  });

  it("reports variable names without leaking values", () => {
    try {
      getAzureAiConfig({ AZURE_OPENAI_ENDPOINT: "secret-value" });
      expect.fail("expected configuration error");
    } catch (error) {
      expect(error).toBeInstanceOf(AzureAiConfigurationError);
      expect((error as AzureAiConfigurationError).missingOrInvalidVariables).toContain("AZURE_OPENAI_ENDPOINT");
      expect((error as Error).message).not.toContain("secret-value");
    }
  });
});
