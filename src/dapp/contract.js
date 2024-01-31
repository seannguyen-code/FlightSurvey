// Import required dependencies and smart contract artifacts
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

// Create a class called "Contract"
export default class Contract {
    constructor() {

    }

    // Initialize the contract and its dependencies based on the network configuration
    async initialize(network) {
        let config = Config[network];
        this.owner = config.ownerAddress;
        this.appAddress = config.appAddress; // Handover required as I will call authorizeCaller directly from index.js
        this.oracleAddresses = config.oracleAddresses;
        await this.initializeWeb3(config);
        await this.initializeContracts(config);

        // Define initial values for airlines, passengers, and flights
        this.airlines = config.startingAirlines;
        this.passengers = config.startingPassengers; // This seems to be missing from the configuration object
        this.flights = config.startingFlights;

        // Update the contract information and set up dropdown options for airlines and flights
        await this.updateContractInfo();

        // Set up dropdown options for airlines and flights in the user interface
        var selectAirlines = document.getElementById("airlines-airline-dropdown");
        for (let counter = 0; counter <= 3; counter++) {
            selectAirlines.options[selectAirlines.options.length] = new Option(this.airlines[counter].name + "(" + this.airlines[counter].address.slice(0, 8) + ")", counter);
        }

        var selectFlights1 = document.getElementById("flights-flights-dropdown");
        var selectFlights2 = document.getElementById("passengers-flights-dropdown");
        for (let counter = 0; counter < this.flights.length; counter++) {
            selectFlights1.options[selectFlights1.options.length] = new Option(this.flights[counter].name + "(" + this.flights[counter].from + " --> " + this.flights[counter].to + ")", counter);
            selectFlights2.options[selectFlights2.options.length] = new Option(this.flights[counter].name + "(" + this.flights[counter].from + " --> " + this.flights[counter].to + ")", counter);
        }
    }

    // Initialize the Web3 provider based on the network configuration
    async initializeWeb3(config) {
        let web3Provider;
        if (window.ethereum) {
            web3Provider = window.ethereum;
            try {
                await window.ethereum.enable();
            } catch (error) {
                console.error("User denied account access");
            }
        } else if (window.web3) {
            web3Provider = window.web3.currentProvider;
        } else {
            web3Provider = new Web3.providers.HttpProvider(config.url);
        }
        this.web3 = new Web3(web3Provider);
        console.log(this.owner);
        this.web3.eth.defaultAccount = this.owner;
    }

    // Initialize the smart contract instances
    async initializeContracts(config) {
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    }

    // Register multiple oracles with the contract
    async registerMultipleOracles(registrationFee) {
        let self = this;
        var success = true;
        console.log(registrationFee, self.oracleAddresses);
        let regFeeWei = this.web3.utils.toWei(registrationFee, 'ether');
        try {
            self.flightSuretyApp.methods
                .registerMultipleOracles(self.oracleAddresses)
                .send({ value: regFeeWei, from: self.owner });
        } catch (error) {
            console.log(error);
            success = false;
        }
        if (success) { console.log('Oracles authorized: ' + self.oracleAddresses + ' by ' + self.owner); }
        const oraclesWithIndexes = [];
        await self.oracleAddresses.forEach(async oracle => {
            let indexes = await self.flightSuretyApp.methods.getMyIndexes().call({ from: oracle });
            console.log(oracle, indexes);
            oraclesWithIndexes.push({ address: oracle, indexes: indexes });
        });
        console.log(oraclesWithIndexes);
    }

    // Get the address of the FlightSuretyData contract
    async getDataContractAddress() {
        return this.flightSuretyData._address;
    }

    // Get the address of the FlightSuretyApp contract
    async getAppContractAddress() {
        return this.flightSuretyApp._address;
    }

    // Authorize the FlightSuretyApp contract to call the FlightSuretyData contract
    async authorizeCaller() {
        let self = this;
        var success = true;
        try {
            self.flightSuretyData.methods
                .authorizeCaller(self.appAddress)
                .send({ from: self.owner });
        } catch (error) {
            console.log(error);
            success = false;
        }
        if (success) { console.log('App contract authorized to call data contract: ' + self.appAddress + ' by ' + self.owner); }
        self.updateContractInfo();
    }

    // Update contract information, such as operational status
    async updateContractInfo() {
        let self = this;
        var statusDataContract = false;
        try {
            statusDataContract = await self.flightSuretyData.methods.isOperational().call({ from: self.owner });
            console.log(statusDataContract);
        } catch (error) {
            console.error(error);
        }
        if (statusDataContract) {
            document.getElementById('contract-operational-status').value = "Operational";
        } else {
            document.getElementById('contract-operational-status').value = "WARNING: Not connected or operational";
        }
    }

    // Get information about an airline based on its index
    async getAirlineInfo(index) {
        let self = this;
        return [self.airlines[index].address, self.airlines[index].name];
    }

    // Get information about a flight based on its index
    async getFlightInfo(index) {
        let self = this;
        return self.flights[index].name;
    }

    // Register an airline with the contract
    async registerAirline(address, name) {
        let self = this;
        try {
            await self.flightSuretyApp.methods.registerAirlineApp(address, name).send({ from: self.owner });
        } catch (error) {
            console.error(error);
        }
    }

    // Fund an airline with ether
    async fundAirline(address, amountEther) {
        let self = this;
        let account = await this.getAccount();
        let amountWei = this.web3.utils.toWei(amountEther, 'ether');
        try {
            await self.flightSuretyApp.methods.fundAirlineApp(address).send({ from: account, value: amountWei });
        } catch (error) {
            console.error(error);
        }
    }

    // Buy insurance for a flight
    async buyInsurance(flight, amountEther) {
        let self = this;
        let account = await self.getAccount();
        let amountWei = self.web3.utils.toWei(amountEther, 'ether');
        console.log(account + amountWei);
        try {
            await self.flightSuretyApp.methods.buyInsuranceApp(flight).send({ from: account, value: amountWei });
        } catch (error) {
            console.error(error);
        }
    }

    // Fetch the status of a flight
    async fetchFlightStatus(flight) {
        let self = this;
        let success = false;
        let timestamp = Math.floor(Date.now() / 1000);
        try {
            await self.flightSuretyApp.methods
                .fetchFlightStatus(self.owner, flight, timestamp) // Flights are not linked to airlines in my implementation
                .send({ from: self.owner }, (error, result) => {
                });
            success = true;
        } catch (error) {
            console.log(error);
        }
        if (success) { console.log("Flight information requested for: " + flight); }
    }

    // Get the current account address
    async getAccount() {
        try {
            let accounts = await this.web3.eth.getAccounts();
            return accounts[0];
        } catch (error) {
            console.log(error);
        }
    }

    // Withdraw insurance payouts
    async withdrawPayout() {
        let self = this;
        let account = await self.getAccount();
        let success = false;
        try {
            await self.flightSuretyApp.methods.withdrawApp().send({ from: account });
            success = true;
        } catch (error) {
            console.log(error);
        }
        if (success) { console.log("Withdraw successful."); }
    }

    // Get the current balance of the contract for the account
    async getPayout() {
        let self = this;
        let account = await self.getAccount();
        let success = false;
        var balance = 0;
        try {
            var balance = await self.flightSuretyData.methods.getBalance(account).call({ from: account });
            console.log(balance);
            success = true;
        } catch (error) {
            console.log(error);
        }
        if (success) { console.log("Update of balance successful."); }
        return self.web3.utils.fromWei(balance, 'ether');
    }
}
