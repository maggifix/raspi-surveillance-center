var BaseSocket = require("./BaseSocket"),
    CONSTANTS = require("../public/constants"),
    STATES = CONSTANTS.STATES,
    Logger = require("./Logger");

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
        return null;
    }
}

ClientStub.prototype = new BaseSocket();

ClientStub.prototype.setupCommuncationHandling = function setup() {
    this.on(STATES.SETUP, handleSetup);
    this.on(STATES.CLOSE, handleClose);
    this.on(STATES.IMG_REQ, handleImgRequest);
    this.on(STATES.BINARY_START_REQ, handleBinaryStart);
    this.on(STATES.BINARY, handleBinaryData);
    this.on(STATES.BINARY_CLOSE, handleBinaryClose);
}

function handleClose() {
    //todo: remove event listers!
    server.removeClient(client);
    client = null;
}

function handleSetup(client, data) {
    //update connection information
    client.TYPE = data.type;

    //send setup completion notice
    client.sendEventOnly(STATES.SETUP_DONE);

    Logger.log("Setup done!", client.ID, CONSTANTS.TYPES[client.TYPE]);
}

function handleImgRequest(client, data) {
    console.log("Image Request:");
    //validate the token
    if (data.token && ServerSecurity.testToken(data.token)) {
        requestUpdatedImage();
    } else {
        //reject the request
        client.sendEventOnly(STATES.IMG_REQ_REJECT);
    }
}

//prepare for receiving binary image data
function handleBinaryStart(client, data) {
    var fStream = connection.details.stream;
    if (!fStream) {
        var path = connection.details.imgPath = "/private/" + data.fileName;
        fStream = connection.details.stream = fs.createWriteStream(__dirname + path);
    }
    client.sendEventOnly(STATES.BINARY_START_ACK);
}

//retrieve image data
function handleBinaryData(client, data) {
    var fStream = connection.details.stream;
    fStream.write(data);
}

//close the stream
function handleBinaryClose(data, connection) {
    var fStream = connection.details.stream;
    fStream.end();
    connection.details.stream = null;

    //send update to all browsers:
    var browsers = ConnectionHandler.getConnectionOfType(CONST.TYPES.BROWSER_CLIENT);
    if (browsers.length > 0) {
        for (var i in browsers)
            browsers[i].sendMessage({
                imgPath: connection.details.imgPath
            }, CONST.STATES.NEW_IMAGE);
    }
}

//request a new image from the mobile client
var lastRequest = -1;

function requestUpdatedImage() {
    var time = (new Date()).getTime();
    //allow updates only after the defined timeframe
    if (lastRequest < 0 || lastRequest <= time - requestImageOnlyEachMs) {
        lastRequest = time;
        var mobile = ConnectionHandler.getConnectionOfType(CONST.TYPES.CAM_CLIENT);
        if (mobile && mobile.length > 0) {
            console.log("Cam client with ID:%s found.", mobile[0].id);
            mobile[0].sendState(STATES.IMG_REQ);
        }
    }
}

module.exports = ClientStub;