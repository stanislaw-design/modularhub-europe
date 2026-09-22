# Azure worker importu projektu domu

Ten katalog tworzy kolejkę Service Bus, jej standardową podkolejkę DLQ, Azure Function na planie Flex Consumption, Managed Identity, storage wykonawczy, Application Insights i wymagane role.

Szablon korzysta z istniejących zasobów Azure OpenAI, Document Intelligence oraz Key Vault. Nie tworzy ich ponownie.

## Sekrety w Key Vault

Przed wdrożeniem utwórz trzy sekrety:

* `house-import-database-url`
* `house-import-r2-access-key-id`
* `house-import-r2-secret-access-key`

Nazwy można zmienić parametrami Bicep. Wartości nie są zapisywane w szablonie ani ustawieniach repozytorium.

## Walidacja i wdrożenie infrastruktury

```powershell
az bicep build --file infra/azure/house-import/main.bicep

az deployment group create `
  --resource-group <resource-group> `
  --template-file infra/azure/house-import/main.bicep `
  --parameters environmentName=dev `
               keyVaultName=<key-vault> `
               azureOpenAiAccountName=<openai-account> `
               documentIntelligenceAccountName=<document-intelligence-account> `
               azureOpenAiDeployment=<deployment> `
               azureOpenAiModelSnapshot=<snapshot> `
               r2AccountId=<r2-account-id> `
               privateR2BucketName=<private-bucket>
```

## Budowa i publikacja kodu

```powershell
npm run build:house-import-function
npm --prefix azure-functions/house-import ci --omit=dev
Set-Location azure-functions/house-import
func azure functionapp publish <function-app-name> --javascript
```

Funkcja używa tylko Managed Identity do Service Bus, Azure OpenAI, Document Intelligence, storage i Key Vault. Retry jest wysyłany jako nowy zaplanowany komunikat. Bieżący komunikat zostaje zakończony dopiero po poprawnym zaplanowaniu następnego. Po wyczerpaniu prób komunikat jest przenoszony do DLQ.
