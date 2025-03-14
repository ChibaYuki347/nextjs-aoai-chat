metadata description = 'Creates an Azure Cosmos DB account.'
param cosmosAccountName string
param location string
@allowed(['Enabled', 'Disabled'])
param publicNetworkAccess string = 'Enabled'
@description('Disable key access to the Cosmos DB account. This is only available for accounts with public network access disabled.')
param disableKeyAccess bool = false

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2022-05-15' = {
  name: cosmosAccountName
  kind: 'GlobalDocumentDB'
  location: location
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    databaseAccountOfferType: 'Standard'
    publicNetworkAccess: publicNetworkAccess
    disableLocalAuth: disableKeyAccess ? true : false
  }
}

output id string = cosmosAccount.id
output name string = cosmosAccount.name
output endpoint string = cosmosAccount.properties.documentEndpoint
