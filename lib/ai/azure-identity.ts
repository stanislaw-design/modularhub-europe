import type { TokenCredential } from "@azure/core-auth";
import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";

function isRunningInAzure(): boolean {
  return Boolean(process.env.WEBSITE_INSTANCE_ID || process.env.IDENTITY_ENDPOINT);
}

export function createAzureCredential(): TokenCredential {
  if (!isRunningInAzure()) return new DefaultAzureCredential();

  const clientId = process.env.AZURE_CLIENT_ID;
  return clientId ? new ManagedIdentityCredential(clientId) : new ManagedIdentityCredential();
}
