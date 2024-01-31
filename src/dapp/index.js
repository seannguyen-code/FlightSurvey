// Import the Contract class, configuration, and CSS stylesheet
import Contract from './contract';
import Config from './config.json';
import './flightsurety.css';

// Listen for the 'load' event on the window
window.addEventListener('load', async () => {
    // Create an instance of the Contract class
    let contract = new Contract();
    
    // Initialize the contract with the 'localhost' network configuration
    await contract.initialize('localhost');

    // Register event listeners for various UI elements and actions

    // Register App Contract
    document.getElementById('contract-register-app-contract').addEventListener('click', async () => {
        await contract.authorizeCaller();
    });

    // Register Oracles
    document.getElementById('contract-register-oracles').addEventListener('click', async () => {
        let registrationFee = document.getElementById('contract-registration-fee').value;
        await contract.registerMultipleOracles(registrationFee);
    });

    // Airline section

    // Register Airlines
    document.getElementById('airlines-register-airlines').addEventListener('click', async () => {
        let selectIndex = document.getElementById('airlines-airline-dropdown').value;
        let airline = await contract.getAirlineInfo(selectIndex);
        await contract.registerAirline(airline[0], airline[1]);
    });

    // Fund Airlines
    document.getElementById('fund').addEventListener('click', async () => {
        let selectIndex = document.getElementById('airlines-airline-dropdown').value;
        let airline = await contract.getAirlineInfo(selectIndex);
        let amount = document.getElementById('airlines-fund-amount').value;
        await contract.fundAirline(airline[0], amount);
    });

    // Flights section

    // Register Flights
    document.getElementById('flights-register-flight').addEventListener('click', async () => {
        let selectIndex = document.getElementById('flights-flights-dropdown').value;
        let flight = await contract.getFlightInfo(selectIndex);
        await contract.registerFlight(flight);
    });

    // Request Oracles for Flights
    document.getElementById('flights-request-oracles').addEventListener('click', async () => {
        let selectIndex = document.getElementById('flights-flights-dropdown').value;
        let flight = await contract.getFlightInfo(selectIndex);
        await contract.fetchFlightStatus(flight);
    });

    // Passenger section

    // Buy Insurance for a Flight
    document.getElementById('passengers-insurance-button').addEventListener('click', async () => {
        let selectIndex = document.getElementById('passengers-flights-dropdown').value;
        let flight = await contract.getFlightInfo(selectIndex);
        let amount = document.getElementById('passengers-insurance-amount').value;
        await contract.buyInsurance(flight, amount);
    });

    // Withdraw Insurance Payout
    document.getElementById('passengers-withdraw-payout').addEventListener('click', async () => {
        await contract.withdrawPayout();
        let amount = await contract.getPayout();
        document.getElementById('passengers-value-payout').value = amount;
    });

    // Get Insurance Payout
    document.getElementById('passengers-get-payout').addEventListener('click', async () => {
        let amount = await contract.getPayout();
        document.getElementById('passengers-value-payout').value = amount;
    });
});
