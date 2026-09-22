targetScope = 'resourceGroup'

@description('Deployment environment name used in resource names.')
@minLength(2)
param environmentName string

@description('Azure region for the worker resources.')
param location string = resourceGroup().location

@description('Name of the existing Key Vault with worker secrets.')
param keyVaultName string

@description('Name of the existing Azure OpenAI Cognitive Services account.')
param azureOpenAiAccountName string

@description('Name of the existing Azure Document Intelligence Cognitive Services account.')
param documentIntelligenceAccountName string

@description('Azure OpenAI deployment used by the worker.')
param azureOpenAiDeployment string

@description('Pinned model snapshot recorded with extraction output.')
param azureOpenAiModelSnapshot string

@description('Cloudflare R2 account identifier.')
param r2AccountId string

@description('Private R2 bucket containing source PDFs.')
param privateR2BucketName string

@description('Key Vault secret name containing DATABASE_URL.')
param databaseUrlSecretName string = 'house-import-database-url'

@description('Key Vault secret name containing the private R2 access key id.')
param privateR2AccessKeySecretName string = 'house-import-r2-access-key-id'

@description('Key Vault secret name containing the private R2 secret access key.')
param privateR2SecretKeySecretName string = 'house-import-r2-secret-access-key'

@description('Maximum number of concurrent function instances.')
@minValue(1)
@maxValue(100)
param maximumInstanceCount int = 20

var token = take(toLower(uniqueString(subscription().id, resourceGroup().id, environmentName)), 10)
var functionAppName = 'func-mhe-house-import-${environmentName}-${token}'
var serviceBusNamespaceName = 'sb-mhe-house-import-${environmentName}-${token}'
var serviceBusQueueName = 'house-project-import'
var storageAccountName = 'stmhe${token}'
var deploymentContainerName = 'function-releases'
var serviceBusDataOwnerRoleId = '090c5cfd-751d-490a-894a-3ce6f1109419'
var storageBlobDataOwnerRoleId = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var storageQueueDataContributorRoleId = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
var storageTableDataContributorRoleId = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
var monitoringMetricsPublisherRoleId = '3913510d-42f4-4e42-8a64-420c390055eb'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var cognitiveServicesOpenAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
var cognitiveServicesUserRoleId = 'a97b65f3-24c7-4388-baec-2e87135dc908'

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' existing = {
  name: keyVaultName
}

resource azureOpenAi 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: azureOpenAiAccountName
}

resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: documentIntelligenceAccountName
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-mhe-house-import-${environmentName}-${token}'
  location: location
  properties: {
    retentionInDays: 30
    features: {
      searchVersion: 1
    }
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-mhe-house-import-${environmentName}-${token}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    DisableLocalAuth: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
  }
  resource blobService 'blobServices' = {
    name: 'default'
    properties: {
      deleteRetentionPolicy: {
        enabled: true
        days: 7
      }
    }
    resource deploymentContainer 'containers' = {
      name: deploymentContainerName
      properties: {
        publicAccess: 'None'
      }
    }
  }
}

resource workerIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-mhe-house-import-${environmentName}-${token}'
  location: location
}

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2024-01-01' = {
  name: serviceBusNamespaceName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    disableLocalAuth: true
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    zoneRedundant: false
  }
}

resource serviceBusQueue 'Microsoft.ServiceBus/namespaces/queues@2024-01-01' = {
  parent: serviceBusNamespace
  name: serviceBusQueueName
  properties: {
    lockDuration: 'PT5M'
    maxSizeInMegabytes: 1024
    requiresDuplicateDetection: true
    duplicateDetectionHistoryTimeWindow: 'PT10M'
    requiresSession: false
    defaultMessageTimeToLive: 'P1D'
    deadLetteringOnMessageExpiration: true
    maxDeliveryCount: 3
    enableBatchedOperations: true
    enableExpress: false
    enablePartitioning: false
    status: 'Active'
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'plan-mhe-house-import-${environmentName}-${token}'
  location: location
  kind: 'functionapp'
  sku: {
    tier: 'FlexConsumption'
    name: 'FC1'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${workerIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: functionPlan.id
    keyVaultReferenceIdentity: workerIdentity.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${deploymentContainerName}'
          authentication: {
            type: 'UserAssignedIdentity'
            userAssignedIdentityResourceId: workerIdentity.id
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: maximumInstanceCount
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'node'
        version: '22'
      }
    }
  }
  resource appSettings 'config' = {
    name: 'appsettings'
    properties: {
      AzureWebJobsStorage__accountName: storage.name
      AzureWebJobsStorage__credential: 'managedidentity'
      AzureWebJobsStorage__clientId: workerIdentity.properties.clientId
      APPINSIGHTS_INSTRUMENTATIONKEY: applicationInsights.properties.InstrumentationKey
      APPLICATIONINSIGHTS_AUTHENTICATION_STRING: 'ClientId=${workerIdentity.properties.clientId};Authorization=AAD'
      HouseImportServiceBus__fullyQualifiedNamespace: '${serviceBusNamespace.name}.servicebus.windows.net'
      HouseImportServiceBus__credential: 'managedidentity'
      HouseImportServiceBus__clientId: workerIdentity.properties.clientId
      AZURE_CLIENT_ID: workerIdentity.properties.clientId
      AZURE_SERVICE_BUS_NAMESPACE: '${serviceBusNamespace.name}.servicebus.windows.net'
      AZURE_SERVICE_BUS_QUEUE: serviceBusQueue.name
      AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: documentIntelligence.properties.endpoint
      AZURE_OPENAI_ENDPOINT: azureOpenAi.properties.endpoint
      AZURE_OPENAI_DEPLOYMENT: azureOpenAiDeployment
      AZURE_OPENAI_MODEL_SNAPSHOT: azureOpenAiModelSnapshot
      R2_ACCOUNT_ID: r2AccountId
      AI_PRIVATE_R2_BUCKET_NAME: privateR2BucketName
      DATABASE_URL: '@Microsoft.KeyVault(SecretUri=https://${keyVault.name}.vault.azure.net/secrets/${databaseUrlSecretName})'
      AI_PRIVATE_R2_ACCESS_KEY_ID: '@Microsoft.KeyVault(SecretUri=https://${keyVault.name}.vault.azure.net/secrets/${privateR2AccessKeySecretName})'
      AI_PRIVATE_R2_SECRET_ACCESS_KEY: '@Microsoft.KeyVault(SecretUri=https://${keyVault.name}.vault.azure.net/secrets/${privateR2SecretKeySecretName})'
    }
  }
}

resource storageBlobOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, workerIdentity.id, storageBlobDataOwnerRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataOwnerRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, workerIdentity.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageQueueContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, workerIdentity.id, storageQueueDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageQueueDataContributorRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageTableContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, workerIdentity.id, storageTableDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageTableDataContributorRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource serviceBusOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace.id, workerIdentity.id, serviceBusDataOwnerRoleId)
  scope: serviceBusNamespace
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', serviceBusDataOwnerRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, workerIdentity.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource openAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(azureOpenAi.id, workerIdentity.id, cognitiveServicesOpenAiUserRoleId)
  scope: azureOpenAi
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUserRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource documentIntelligenceUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(documentIntelligence.id, workerIdentity.id, cognitiveServicesUserRoleId)
  scope: documentIntelligence
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource metricsPublisher 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(applicationInsights.id, workerIdentity.id, monitoringMetricsPublisherRoleId)
  scope: applicationInsights
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', monitoringMetricsPublisherRoleId)
    principalId: workerIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output functionAppName string = functionApp.name
output serviceBusNamespace string = serviceBusNamespace.name
output serviceBusQueue string = serviceBusQueue.name
output workerIdentityClientId string = workerIdentity.properties.clientId
output deploymentStorageContainerUri string = '${storage.properties.primaryEndpoints.blob}${deploymentContainerName}'
