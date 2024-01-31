pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct airlineStructType {
        //struc for airlines
        string name;
        bool isFunded; // funded
        bool isAccepted; // accepted to be airline
        uint256 ID; // ID to identify airline
    }

    mapping(address => airlineStructType) private airlines;

    uint256 airlineCount;

    mapping(bytes32 => address[]) private insureesPerFlight; //bytes32 maps/refers to id of flight, address[] array of passengers that have insurance for that flight

    struct passengerStructType {
        mapping(bytes32 => uint256) payOutAmount; //byes32 maps/refers to id of flightID
        uint256 credit;
    }
    mapping(address => passengerStructType) private passengers;

    struct flightStructType {
        uint8 statusCode;
        uint256 timeStamp;
    }

    mapping(bytes32 => flightStructType) private flights; //byes32 maps/refers to id of flightID

    address private contractOwner; // Account used to deploy contract

    mapping(address => bool) authorizedContracts; // App contracts that are allowed by owner to call this data contract

    bool private operational = true; // Blocks all state changes throughout the contract if false

    uint constant M = 2; //Defines number of votes needed set operational status
    address[] multiCalls = new address[](0); //array to identify whether address already voted for setOperational() status

    uint256 airlineToVoteFor = 0; // Which airline is currently voted to be registered - referring to airlineStructType.ID
    address[] multiCallsAirlineVote = new address[](0); //array to identify whether address already voted for voteAirlineIn() status

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AirlineRegistered(
        address appUserAddress,
        address airlineAddress,
        string name,
        uint256 airlineCount
    );
    event AirlineVoteCasted(uint256 voteNumber, address airlineToVoteFor);
    event SuccessfulAirlineVoteCasted(
        uint256 voteNumber,
        uint256 voteHurdle,
        address airlineToVoteFor
    );
    event CreditPaidOut(address _passenger, uint256 creditPaidOut);
    event PayOutCredited(address _insuree, uint256 payOutAmount);
    event FlightProcessed(string flight, uint8 statusCode);
    event InsureesToFund(address[] insurees);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() {
        contractOwner = msg.sender;
        //Contract owner is automtically registered as
        airlines[msg.sender].name = "Contract owner Airways";
        airlines[msg.sender].isFunded = true;
        airlines[msg.sender].isAccepted = true;
        airlines[msg.sender].ID = 1;

        //Set airline count for airlines[].ID setting
        airlineCount = 1;

        authorizedContracts[msg.sender] = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireCallerAuthorized() {
        require(
            authorizedContracts[msg.sender],
            string.concat(
                Strings.toHexString(uint160(msg.sender)),
                " is not authorized contract"
            )
        );
        _;
    }

    /**
     * @dev Modifier that requires caller to be airline
     *
     */

    function isAirline(address _address) external view returns (bool) {
        bool _isAirline;
        if (airlines[_address].ID != 0) {
            _isAirline = true;
        } else {
            _isAirline = false;
        }
        return (_isAirline);
    }

    /**
     * @dev Modifier that requires caller to be airline that can be
     *      Voting requires funding and being accepted by other airlines
     */
    function isVotingAirline(address _address) public view returns (bool) {
        bool _isVotingAirline;
        _isVotingAirline = false;
        if (
            (airlines[_address].ID != 0) &&
            (airlines[_address].isFunded) &&
            (airlines[_address].isAccepted)
        ) {
            _isVotingAirline = true;
        }
        return (_isVotingAirline);
    }

    /**
     * @dev Function to retrieve airlinedata
     *
     */
    function isFundedAirline(address _address) public view returns (bool) {
        require(airlines[_address].ID != 0, "Airline not in data set.");
        return (airlines[_address].isFunded);
    }

    function isAcceptedAirline(address _address) public view returns (bool) {
        require(airlines[_address].ID != 0, "Airline not in data set.");
        return (airlines[_address].isAccepted);
    }

    function getPayOutAmount(
        address passengerAddress,
        string memory flightName
    ) public view returns (uint256) {
        bytes32 flightID = getFlightID(flightName);
        uint256 _payOutAmount = passengers[passengerAddress].payOutAmount[
            flightID
        ];
        return (_payOutAmount);
    }

    /********************************************************************************************/
    /*                                 REFERENCE DATA APP CONTRACT  FUNCTIONS                   */
    /********************************************************************************************/

    function authorizeCaller(address appContract) public requireContractOwner {
        require(
            authorizedContracts[appContract] != true,
            "Caller is already authorized"
        );
        authorizedContracts[appContract] = true;
    }

    function deauthorizeCaller(
        address appContract
    ) public requireContractOwner {
        delete authorizedContracts[appContract];
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational()
        public
        view
        requireCallerAuthorized
        returns (bool)
    {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(
        bool mode,
        address appUserAddress
    ) external requireCallerAuthorized {
        require(
            isVotingAirline(appUserAddress),
            "Caller is not funded and registered airline"
        );
        require(
            mode != operational,
            "New mode must be different from existing mode"
        );
        bool isDuplicate = false;
        for (uint c = 0; c < multiCalls.length; c++) {
            if (multiCalls[c] == appUserAddress) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Caller has already called this function.");

        multiCalls.push(appUserAddress);
        if (multiCalls.length >= M) {
            operational = mode;
            multiCalls = new address[](0);
        }
    }

    function getFlightID(
        string memory _flightName
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_flightName));
    }

    function getBalance(address _passenger) external view returns (uint256) {
        return (passengers[_passenger].credit);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(
        address appUserAddress,
        address airlineAddress,
        string calldata name
    ) public requireCallerAuthorized {
        //First 3 airlines can be registered without vote, afterwards an airline can only be regietered if the voting for the previous airline is concluded
        require(
            airlines[airlineAddress].ID == 0,
            "Airline is already registered."
        );
        require(
            (airlineToVoteFor == 0) || (airlineCount <= 3),
            "There is currently an unfinished registration process going on. Please finish that first"
        );

        airlineCount = airlineCount.add(1);
        airlines[airlineAddress].ID = airlineCount;
        airlines[airlineAddress].name = name;
        airlines[airlineAddress].isFunded = false;

        //The first four airlines are registered/accepted without a vote
        if (airlineCount <= 4) {
            airlines[airlineAddress].isAccepted = true;
        } else {
            airlines[airlineAddress].isAccepted = false;

            // Opening  vote for this airline
            airlineToVoteFor = airlineCount;
        }
        emit AirlineRegistered(
            appUserAddress,
            airlineAddress,
            name,
            airlineCount
        );
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function voteAirlineIn(
        address airlineCastedVoteFor,
        address appUserAddress
    ) external requireCallerAuthorized {
        require(
            isVotingAirline(appUserAddress),
            "Caller is not funded and registered airline"
        );
        require(
            airlines[airlineCastedVoteFor].ID == airlineToVoteFor,
            "Vote casted for the wrong airline"
        );
        bool isDuplicate = false;
        for (uint c = 0; c < multiCallsAirlineVote.length; c++) {
            if (multiCallsAirlineVote[c] == appUserAddress) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Caller has already called this function.");

        multiCallsAirlineVote.push(appUserAddress);
        uint256 hurdle = airlineCount.sub(1).div(2);
        if (multiCallsAirlineVote.length >= hurdle) {
            // Airline is accepted
            airlines[airlineCastedVoteFor].isAccepted = true;

            emit SuccessfulAirlineVoteCasted(
                multiCallsAirlineVote.length,
                hurdle,
                airlineCastedVoteFor
            );

            //Airlinevote is reset
            airlineToVoteFor = 0;
            multiCallsAirlineVote = new address[](0);
        } else {
            emit AirlineVoteCasted(
                multiCallsAirlineVote.length,
                airlineCastedVoteFor
            );
        }
    }

    /**
     * @dev Sets contract operations on/off
     *
     * Contract owner can reset any ongoing vote with leaving the airline that is voted for unregistered
     */
    function resetAirlineVote()
        external
        requireCallerAuthorized
        requireContractOwner
    {
        airlineToVoteFor = 0;
        multiCallsAirlineVote = new address[](0);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buyInsurance(
        address passengerAddress,
        bytes32 flightID,
        uint256 addPayOutAmount
    ) external payable requireCallerAuthorized requireIsOperational {
        //passengers[passengerAddress].insurances[flightID].paidIn = msg.value;
        uint256 beginPayOutAmount = passengers[passengerAddress].payOutAmount[
            flightID
        ];
        passengers[passengerAddress].payOutAmount[flightID] = beginPayOutAmount
            .add(addPayOutAmount);
        insureesPerFlight[flightID].push(passengerAddress);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(
        bytes32 flightID
    ) external requireCallerAuthorized requireIsOperational {
        // Debit before credit
        address[] memory insurees = insureesPerFlight[flightID];
        // delete insureesPerFlight[flightID];

        emit InsureesToFund(insurees);

        //Loop through index of insurees per flight
        for (uint256 i = 0; i < insurees.length; i++) {
            address insuree = insurees[i];
            //Debit before Credit
            uint256 _payOutAmount = passengers[insuree].payOutAmount[flightID];
            passengers[insuree].payOutAmount[flightID] = 0;

            //Credit PayOutAmount to Balance/credit
            passengers[insuree].credit = passengers[insuree].credit.add(
                _payOutAmount
            );
            emit PayOutCredited(insuree, _payOutAmount);
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function withdraw(
        address _passenger
    ) public payable requireCallerAuthorized {
        require(
            _passenger == tx.origin,
            "Withdraw request must originate from passenger itself."
        );
        require(
            passengers[_passenger].credit > 0,
            "No pay out amounts allocated to passenger."
        );
        //Debit before credit
        uint256 credit = passengers[_passenger].credit;
        passengers[_passenger].credit = 0;

        bool sent = payable(_passenger).send(credit);
        require(sent, "Failed to send Ether");

        emit CreditPaidOut(_passenger, credit);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fundAirline(
        address airline
    ) public payable requireCallerAuthorized requireIsOperational {
        // Airline must be registered first
        require(
            airlines[airline].ID != 0,
            "No data for this airline yet. Please register airline first."
        );
        // Avoid double funding
        require(
            airlines[airline].isFunded = true,
            "airline is already fully funded."
        );

        airlines[airline].isFunded = true;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {}

    receive() external payable {}
}
