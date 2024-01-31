// Import required dependencies and smart contract artifacts
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

// Export a function that will be executed during deployment
module.exports = function(deployer) {
    
    // Define the address of the first airline
    let firstAirline = '0x7bEaaF4C2fEE180021e7A8C4A22616Bb938c8b1C';

    // Deploy the FlightSuretyData smart contract
    deployer.deploy(FlightSuretyData)
    .then(() => {
        // Once FlightSuretyData is deployed, deploy FlightSuretyApp and pass the address of FlightSuretyData
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(() => {
                    // Define a configuration object with various parameters
                    let config = {
                        localhost: {
                            url: 'http://localhost:8545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address,
                            ownerAddress: '0x51f9378B809cb9485dF83beEEECF20b23792F161',
                            startingAirlines: [
                                {name: "Owner Airline", address: '0x51f9378B809cb9485dF83beEEECF20b23792F161'}, 
                                {name: "First Airline", address: '0xe2B1b777259a815bbee83030263402cd5cD15528'}, 
                                {name: "Second Airline", address: '0x28DF7Ee41CbA72dF2E2972fBA63487ADF32412C0'},
                                {name: "Third Airline", address: '0xc4F3F8EEb275Aa6558Eb5f0BD94059c82FE221f5'}
                            ],
                            startingFlights: [
                                {name: "AL123", from: "FRA", to: "LHR"},
                                {name: "AL456", from: "FRA", to: "JFK"},
                                {name: "AL789", from: "FRA", to: "SYD"}
                            ],
                            oracleAddresses:['0xA2CAd9a05fe8B6942d7aCE68D7a72176a0e6838A', /* ... */ ]
                        }
                    }
                    
                    // Write the configuration object to a JSON file for use in the Dapp and server
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    });
}
