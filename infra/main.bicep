targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Use Private Endpoint')
param usePrivateEndpoint bool = false

// public network access
@description('Public network access value for all deployed resources')
@allowed(['Enabled', 'Disabled'])
param publicNetworkAccess string = 'Enabled'

// Azure OpenAI
// openai resouce region
@description('Region for the OpenAI resource')
@allowed(['eastus', 'eastus2', 'northcentralus', 'swedebcentral', 'westus', 'westus3'])
param openaiRegion string = 'westus3'

// deployment name of the openai resource
@description('Deployment name of the OpenAI resource')
param deploymentName string = 'gpt-4o'

// deployment version of the openai resource
@description('Deployment version of the OpenAI resource')
param deploymentVersion string = '2024-05-13'

// Azure OpenAI Assistant ID
@description('Assistant ID of the OpenAI resource')
param openaiAssistantId string = 'assistant-1'
// Azure OpenAI File Font ID
@description('File Font ID of the OpenAI resource')
param openaiFontFileId string = 'font-1'


// Tags that should be applied to all resources.
// 
// Note that 'azd-service-name' tags should be applied separately to service host resources.
// Example usage:
//   tags: union(tags, { 'azd-service-name': <service name in azure.yaml> })
var tags = {
  'azd-env-name': environmentName
}

var abbrs = loadJsonContent('./abbreviations.json')

// Generate a unique token to be used in naming resources.
// Remove linter suppression after using.
#disable-next-line no-unused-vars
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

// App Service Plan
module hostingPlan 'core/host/appserviceplan.bicep' = {
  name: 'hostingPlan'
  scope: rg
  params: {
    location: location
    name: '${abbrs.webServerFarms}nextjs-aoai${resourceToken}'
    sku: {
      name: 'S1'
      tier: 'Standard'
      capacity: 1
    }
  }
}

// Private endpoint
module isolation 'network-isolation.bicep' = if (usePrivateEndpoint) {
  name: 'isolation'
  scope: rg
  params: {
    location: location
    vnetName: '${abbrs.networkVirtualNetworks}${resourceToken}'
    appServicePlanName: hostingPlan.name
    usePrivateEndpoint: true
  }
}

// Azure OpenAI
module openai 'core/ai/cognitiveservices.bicep' = {
  name: 'openai'
  scope: rg
  params: {
    name: 'aoai${abbrs.cognitiveServicesAccounts}${resourceToken}'
    location: openaiRegion
    sku: {
      name: 'S0'
    }
    deployments: [
      {
        name: 'gpt-4o'
        model: {
          format: 'OpenAI'
          name: deploymentName
          version: deploymentVersion
        }
        sku: {
          name: 'Standard'
          capacity: 100
        }
      }
    ]
    publicNetworkAccess: publicNetworkAccess
  }
}

// Cosmos DB
module cosmosAccount 'core/database/cosmos.bicep' = {
  name: 'cosmos'
  scope: rg
  params: {
    cosmosAccountName: toLower('${abbrs.documentDBDatabaseAccounts}${resourceToken}')
    location: location
    publicNetworkAccess: publicNetworkAccess
  }
}

var openaiPrivateEndppointConnection = [{
  groupId: 'account'
  dnsZoneName: 'privatelink.openai.com'
  resourceIds: [openai.outputs.id]
}]

var cosmosPrivateEndpointConnection = [{
  groupId: 'sql'
  dnsZoneName: 'privatelink.documents.azure.com'
  resourceIds: [cosmosAccount.outputs.id]
}]

var privateEndpointConnections = concat(openaiPrivateEndppointConnection, cosmosPrivateEndpointConnection)



module privateEndpoints 'private-endpoints.bicep' = if (usePrivateEndpoint) {
  name: 'privateEndpoints'
  scope: rg
  params: {
    location: location
    resourceToken: resourceToken
    privateEndpointConnections: privateEndpointConnections
    vnetName: usePrivateEndpoint ? isolation.outputs.vnetName : ''
    vnetPeSubnetName: usePrivateEndpoint ? isolation.outputs.backendSubnetId : ''
  }
}

// App Service with Node.js
module website 'website.bicep' = {
  name: 'nextjsapp'
  scope: rg
  params: {
    location: location
    name: '${abbrs.webSitesAppService}nextapp-${resourceToken}'
    tags: tags
    appServicePlanId: hostingPlan.outputs.id
    cosmosAccountName: cosmosAccount.outputs.name
    openaiResouceName: openai.outputs.name
    usePrivateEndpoint: usePrivateEndpoint
    virtualNetworkSubnetId: usePrivateEndpoint ? isolation.outputs.backendSubnetId : ''
    openaiAssistantId: openaiAssistantId
    openaiFileFontId: openaiFontFileId
  }
}



output AZURE_OPENAI_ENDPOINT string = openai.outputs.endpoint
output AZURE_OPENAI_API_KEY string = openai.outputs.key
output AZURE_OPENAI_DEPLOYMENT_NAME string = deploymentName
// const apiKey = process.env.AZURE_OPENAI_API_KEY;
// const apiVersion = process.env.API_VERSION;
// const deploymentName = process.env.DEPLOYMENT_NAME;
// let assistantId = process.env.ASSISTANT_ID;
// let fileFontId = process.env.FONT_FILE_ID;
