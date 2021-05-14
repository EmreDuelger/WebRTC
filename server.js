/*var express = require('express');
const ws = require('ws');
const app = express();

const port = 8080;


// Set public folder as root
app.use(express.static(__dirname));

// Provide access to node_modules folder from the client-side
app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Redirect all traffic to index.html
app.use((req, res) => res.sendFile(`${__dirname}/Frontend/index.html`));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//console.log(app.port);

const server = require('http').createServer(app);

const io = require('client.io')(server);

server.listen(port, () => {
  console.info('listening on %d', port);
});


// Require the server
const Server = require('signal-fire').Server

// Instantiate a new Server
const servers = new Server({
  // These options are passed directly to ws
  port: 8081
})

servers.on('add_peer', peer => {
  console.log(`Added peer with peerId ${peer.peerId}`)
})

servers.on('remove_peer', peerId => {
  console.log(`Removed peer with peerId ${peerId}`)
})

servers.start().then(() => {
  console.log('Server started')
})*/
/*
const express = require("express");
const app = express();

const port = 8080;

const http = require("http");
const server = http.createServer(app);


    // use express static to deliver resources HTML, CSS, JS, etc)
// from the public folder

app.use(express.static(__dirname));

// Provide access to node_modules folder from the client-side

app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Redirect all traffic to index.html

app.use((req, res) => res.sendFile(`${__dirname}/Frontend/index.html`));

const wsApp = expressWs(app, server).app;

// expose websocket under /ws
// handleSocketConnection is explained later
wsApp.ws("/ws", handleSocketConnection);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`server started on http://localhost:${port}`);
});


interface LoginWebSocketMessage {
  channel: "login";
  name: string;
}

interface StartCallWebSocketMessage {
  channel: "start_call";
  otherPerson: string;
}

interface WebRTCIceCandidateWebSocketMessage {
  channel: "webrtc_ice_candidate";
  candidate: RTCIceCandidate;
  otherPerson: string;
}

interface WebRTCOfferWebSocketMessage {
  channel: "webrtc_offer";
  offer: RTCSessionDescription;
  otherPerson: string;
}

interface WebRTCAnswerWebSocketMessage {
  channel: "webrtc_answer";
  answer: RTCSessionDescription;
  otherPerson: string;
}

// these 4 messages are related to the call itself, thus we can
// bundle them in this type union, maybe we need that later
type WebSocketCallMessage =
  StartCallWebSocketMessage
  | WebRTCIceCandidateWebSocketMessage
  | WebRTCOfferWebSocketMessage
  | WebRTCAnswerWebSocketMessage;

// our overall type union for websocket messages in our backend spans
// both login and call messages
type WebSocketMessage = LoginWebSocketMessage | WebSocketCallMessage;
*/

//require our websocket library 
var WebSocketServer = require('ws').Server; 
var listening_to_port = 8080; 
//var keys;
//creating a websocket server at port 9090 
var wss = new WebSocketServer({port: 9090}); 

const express = require("express");
const app = express();

const http = require("http");
const server = http.createServer(app, wss);

server.listen( listening_to_port, () => {
  console.log(`server started on http://localhost:${listening_to_port}`);
});


    // use express static to deliver resources HTML, CSS, JS, etc)
// from the public folder

app.use(express.static(__dirname));

// Provide access to node_modules folder from the client-side

app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Redirect all traffic to index.html

app.get("/home", function(req, res){
   res.sendFile(`${__dirname}/Frontend/login.html`);
});

app.get("/dashboard", function(req, res){
   res.sendFile(`${__dirname}/Frontend/dashboard.html`);
});

app.get("/videocall", function(req, res){
   res.sendFile(`${__dirname}/Frontend/videocall.html`);
});


app.get('/users', function(req, res){

   var obj = users;
   var keys = Object.keys(users);
	console.log(keys);
   res.send({"users": keys});

});

//all connected to the server users 
var users = {};
  
//when a user connects to our sever 
wss.on('connection', function(connection) {
  
   console.log("User connected");
	
   //when server gets a message from a connected user 
   connection.on('message', function(message) { 
	
      var data; 
		
      //accepting only JSON messages 
      try { 
         data = JSON.parse(message);
         //console.log(users);
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      }
		
      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login
         case "login": 
            console.log("User logged", data.name); 
				
            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               sendTo(connection, { 
                  type: "login", 
                  success: false 
               }); 
            } else { 
               //save user connection on the server 
               users[data.name] = connection; 
               connection.name = data.name; 
					
               sendTo(connection, { 
                  type: "login", 
                  success: true 
               }); 
            } 
				
            break;
				
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name);
				
            //if UserB exists then send him offer details 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               //setting that UserA connected with UserB 
               connection.otherName = data.name; 
					
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: connection.name 
               }); 
            }
				
            break;
				
         case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               connection.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               }); 
            } 
				
            break; 
				
         case "candidate": 
            console.log("Sending candidate to:",data.name); 
            var conn = users[data.name];
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate 
               }); 
            } 
				
            break;
				
         case "leave": 
            console.log("Disconnecting from", data.name); 
            var conn = users[data.name]; 
            conn.otherName = null; 
				
            //notify the other user so he can disconnect his peer connection 
            if(conn != null) {
               sendTo(conn, { 
                  type: "leave" 
              }); 
            }
				
            break;
				
         default: 
            sendTo(connection, { 
               type: "error", 
               message: "Command not found: " + data.type 
            }); 
				
            break; 
      }
		
   }); 
	
   //when user exits, for example closes a browser window 
   //this may help if we are still in "offer","answer" or "candidate" state 
   connection.on("close", function() { 
	
      if(connection.name) { 
         delete users[connection.name]; 
			
         if(connection.otherName) { 
            console.log("Disconnecting from ", connection.otherName); 
            var conn = users[connection.otherName]; 
            conn.otherName = null;
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               }); 
            }
         } 
      }
		
   });
//   var obj = users;
  // var keys = Object.keys(users);
	//console.log(keys);
   connection.send('Hello World!!!');  
});
  
function sendTo(connection, message) { 
   connection.send(JSON.stringify(message)); 
}

