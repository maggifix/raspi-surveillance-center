var BaseSocket = require("./BaseSocket"),
    CONSTANTS = require("../public/constants"),
    STATES = CONSTANTS.STATES,
    Logger = require("./Logger"),
    fs = require("fs");

/*
* Handles all the communication between server and client
* @constructor
*
*/
function ClientStub(config) {
    try {
        this.ID = config.ID;
        this.eventListeners = {};
        this.ws = config.ws;
        this.server = config.server;
        this.binary = {
            stream: null,
            imgPath: null
        };

        //configure the internal eventhandlers
        this._setupWebSocketEvents();
        this.setupCommuncationHandling();

        //send initial setup request
        this.sendEventOnly(STATES.SETUP_REQ);
    } catch (exception) {
        Logger.err("ClientStub creation:", exception.message);
    }
}

ClientStub.prototype = new BaseSocket();

ClientStub.prototype.setupCommuncationHandling = function setup() {
    this.on(STATES.SETUP, handleSetup);
    this.on(STATES.CONNECTION_CLOSED, handleClose);
    this.on(STATES.BINARY_START_REQ, handleBinaryStart);
    this.on(STATES.BINARY, handleBinaryData);
    this.on(STATES.BINARY_CLOSE, handleBinaryClose);
}

function handleClose(client) {
    //todo: remove event listers!
    client.server.removeClient(client);
    client = null;
}

function handleSetup(client, data) {
    //update connection information
    client.TYPE = data.type;
    
    //try to find a open connection to this client and close the old connection
    var oldConnection = client.server.findClientById(data.ID);
    Logger.log("Old ID:",data.ID);
    if(oldConnection){
        Logger.log("Closing old connection");
        oldConnection.ws.close();
        handleClose(client);
    }
    
    //send setup completion notice
    //client.sendEventOnly(STATES.SETUP_DONE);
    client.send({ID:client.ID},STATES.SETUP_DONE);

    Logger.log("Setup done!", client.ID, CONSTANTS.TYPES[client.TYPE]);
}

//prepare for receiving binary image data
function handleBinaryStart(client, data) {
    var fStream = client.binary.stream;
    if (!fStream) {
        var path = client.binary.imgPath = "/../private/" + data.fileName;
        fStream = client.binary.stream = fs.createWriteStream(__dirname + path);
    }
    client.sendEventOnly(STATES.BINARY_START_ACK);
}

//retrieve image data
function handleBinaryData(client, data) {
  Logger.log("Binary",data);
    var fStream = client.binary.stream;
    fStream.write(data);
}

//close the stream
function handleBinaryClose(client, data) {
    var fStream = client.binary.stream;
    if(fStream) fStream.end();
    client.binary.stream = null;

    //send update to all browsers:
    var browsers = client.server.getClientsByType(CONSTANTS.TYPES.BROWSER_CLIENT);
    if (browsers.length > 0) {
        for (var i in browsers)
            browsers[i].send({
                imgPath: client.binary.imgPath
            }, CONSTANTS.STATES.NEW_IMAGE);
    }
}

module.exports = ClientStub;
