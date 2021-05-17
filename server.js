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

var bodyParser = require('body-parser');
var path = require('path');

server.listen( listening_to_port, () => {
  console.log(`server started on http://localhost:${listening_to_port}`);
});


// URL at which MongoDB service is running
var url = "mongodb://localhost:27017";
 
// A Client to MongoDB
var MongoClient = require('mongodb').MongoClient;

// Make a connection to MongoDB Service
/*MongoClient.connect(url, function(err, db) {
   if (err) throw err;
   console.log("Connected to MongoDB!");

   console.log(db.databaseName);
 });*/

const client = new MongoClient(url, { useUnifiedTopology: true }); // useUnifiedTopology removes a warning

// Connect
/*client
  .connect()
  .then(client =>
    client
      .db()
      .admin()
      .listDatabases() // Returns a promise that will resolve to the list of databases
  )
  .then(dbs => {
    //console.log("Mongo databases", dbs);
    list = dbs.databases;
    for(db in list){
       test = list[db];
       console.log(test['name']);
       trainer = stringify( test['name']);
         if(trainer === 'trainer'){
//console.log('trainer');

         }

            
            
    }
    
  })
  .finally(() => client.close()); // Closing after getting the data
*/
MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {

   if (err) throw err;

   const db = client.db("trainer");

   db.listCollections().toArray().then((docs) => {

       console.log('Available collections:');
       docs.forEach((doc, idx, array) => { console.log(doc.name) });

   }).catch((err) => {

       console.log(err);
   })//.finally(() => {

  //     client.close();
  // });
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
   res.sendFile(`${__dirname}/Frontend/dashboard/dashboard.html`);
});

app.get("/videocall", function(req, res){
   res.sendFile(`${__dirname}/Frontend/videocall.html`);
});

app.get("/videoanalyzer", function(req, res){
   res.sendFile(`${__dirname}/Frontend/videoanalyzer.html`);
});


app.get('/users', function(req, res){

   var obj = users;
   var keys = Object.keys(users);
	console.log(keys);
   res.send({"users": keys});

});


app.post('/signup', function(req, res)
{
//andre
});

app.post('/auth', function(req, res)
{
//emre
});

//all connected to the server users 
var users = {};
  
//when a user connects to our server Websocket-Connecting
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
					console.log(connection.name);
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
         //delete users[connection.name]; 
			
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

