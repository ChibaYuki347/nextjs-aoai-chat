metadata description = 'Creates an Azure App Service in an existing Azure App Service plan.'

param location string
param tags object = {}
param name string
param appServicePlanId string
param openaiResouceName string
param cosmosAccountName string
param usePrivateEndpoint bool = false
param virtualNetworkSubnetId string = ''

// Azure OpenAI Assistant ID
param openaiAssistantId string
// Azure OpenAI Font File ID
param openaiFileFontId string

// Exsisting Azure OpenAI resource
resource openai 'Microsoft.CognitiveServices/accounts@2022-03-01' existing = {
  name: openaiResouceName
}
// Exsisting Cosmos DB account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2022-05-15' existing = {
  name: cosmosAccountName
}


module appservice './core/host/appservice.bicep' = {
  name: 'appservice'
  params: {
    location: location
    name: name
    tags: tags
    appServicePlanId: appServicePlanId
    appCommandLine: 'pm2 --no-daemon start  ecosystem.config.js'
    runtimeName: 'node'
    runtimeVersion: '20'
    scmType: 'GitHub'
    scmDoBuildDuringDeployment: true
    appSettings: {
      // Azure OpenAI Resource Name
      AZURE_OPENAI_RESOURCE_NAME: openai.name
      //Azure OpenAI API Key
      AZURE_OPENAI_API_KEY: openai.listKeys().key1
      //Cosmos DB Endpoint
      COSMOS_DB_ENDPOINT: cosmosAccount.properties.documentEndpoint
      //Cosmos DB Key
      COSMOS_DB_KEY: cosmosAccount.listKeys().primaryMasterKey
      //Azure OpenAI Assistant ID
      AZURE_OPENAI_ASSISTANT_ID: openaiAssistantId
      //Azure OpenAI Font File ID
      AZURE_OPENAI_FONT_FILE_ID: openaiFileFontId
      // npm start Port
      PORT: 3000
    }
    virtualNetworkSubnetId: usePrivateEndpoint ? virtualNetworkSubnetId : null
  }
}
