import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

let oraclesWithIndexes = [];

function initializeOracles(oracleAddresses, owner) {
  let regFeeAllOracles =
    web3.utils.toWei("1", "ether") * oracleAddresses.length;
  console.log(regFeeAllOracles);
  flightSuretyApp.methods
    .registerMultipleOracles(oracleAddresses)
    .send(
      { value: regFeeAllOracles, from: owner, gas: 3000000 },
      (error, result) => {
        if (error) {
          console.log("Error in registration: " + error);
        } else {
          console.log(
            "Oracles authorized: " + oracleAddresses + " by " + owner
          );
          // const oraclesWithIndexes = [];
          oracleAddresses.forEach((oracle) => {
            flightSuretyApp.methods
              .getMyIndexes()
              .call({ from: oracle }, (error, result) => {
                if (error) {
                  console.log(
                    "Error in retieving indexes for: " + oracle + " : " + error
                  );
                } else {
                  let indexes = result;
                  console.log(oracle, indexes);
                  oraclesWithIndexes.push({
                    address: oracle,
                    indexes: indexes,
                  });
                }
              });
          });
          return oraclesWithIndexes;
        }
      }
    );
}

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);
let oracles = initializeOracles(config.oracleAddresses, config.ownerAddress);

flightSuretyApp.events.OracleRequest(
  { fromBlock: 0 },
  async function (error, event) {
    if (error) console.log(error);
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;
    console.log(
      "Event caught with index: " +
        index +
        ", for flight: " +
        flight +
        ", with   timestamp: " +
        timestamp
    );

    let statusCode = STATUS_CODE_UNKNOWN;
    let random = Math.floor(Math.random() * 10);
    if (random == 0) {
      statusCode = STATUS_CODE_UNKNOWN;
    } else if (random == 1) {
      statusCode = STATUS_CODE_ON_TIME;
    } else if (random in [2, 3, 4, 5, 6, 7]) {
      //Overweighting to reflect reality :-)
      statusCode = STATUS_CODE_LATE_AIRLINE;
    } else if (random == 8) {
      statusCode = STATUS_CODE_LATE_WEATHER;
    } else if (random == 9) {
      statusCode = STATUS_CODE_LATE_TECHNICAL;
    } else if (random == 10) {
      statusCode = STATUS_CODE_LATE_OTHER;
    }
    //Overruling for testing
    //statusCode=20;

    oraclesWithIndexes.forEach(async (oracle) => {
      // let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracle.address });
      // console.log("Indexes receveived "+oracle+" : "+indexes);
      //oracles.push({address: oracle, indexes: indexes});

      if (oracle.indexes.includes(index)) {
        //console.log("Index fit: "+oracle+indexes);
        flightSuretyApp.methods
          .submitOracleResponse(index, airline, flight, timestamp, statusCode)
          .send({ from: oracle.address, gas: 300000 }, (error, result) => {
            if (error) {
              console.log(error);
            } else {
              console.log(
                "Response submitted: " +
                  oracle.address +
                  " with indexes: " +
                  oracle.indexes +
                  " with status code: " +
                  statusCode
              );
            }
          });
      }
    });
    // console.log(oracles);

    console.log("Indexes request finished.");

    //   oracles.forEach(async oracle => {
    //     if (oracle.indexes.includes(index)) {
    //       try {
    //         console.log('Answer: '+oracle.address+oracle.indexes);
    //         await flightSuretyApp.methods.submitOracleResponse(
    //           index,
    //           flight,
    //           Math.floor(Date.now()/1000),
    //           statusCode
    //         ).send({ from: oracle.address, gas: 3000000 });
    //       } catch (e) {
    //         console.log(e);
    //       }

    //       console.log(`Oracle ${oracle.address} responded with status code ${statusCode}`);
    //   }
    //   console.log(event)
    // });
  }
);

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});
export default app;
