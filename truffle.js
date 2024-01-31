var HDWalletProvider = require("@truffle/hdwallet-provider");
var mnemonic = "erosion furnace duty exhaust mirror harvest proof pact anchor rabbit tiny chaos";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      accounts: 50,
    }
  },
  compilers: {
    solc: {
      version: "^0.8.17"
    }
  }
};