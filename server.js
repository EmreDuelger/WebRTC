//require our websocket library 
var WebSocketServer = require('ws').Server; 
var listening_to_port = 8080; 
//var keys;
//creating a websocket server at port 9090 
var wss = new WebSocketServer({port: 9090}); 

const express = require("express");
const app = express();

const session = require("express-session");

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

//MongoDB-Connection
const client = new MongoClient(url, { useUnifiedTopology: true }); // useUnifiedTopology removes a warning

var db;

MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {

   if (err) throw err;

   db = client.db("trainer");

   db.listCollections().toArray().then((docs) => {

       console.log('Available collections:');
       docs.forEach((doc, idx, array) => { console.log(doc.name) });

   }).catch((err) => {

       console.log(err);
   })//.finally(() => {

  //     client.close();
  // });
});

app.set("view engine", "ejs");

// use express static to deliver resources HTML, CSS, JS, etc)
// from the public folder

app.use(express.static(__dirname));

app.use(express.static(path.join(__dirname, "public")));

// Provide access to node_modules folder from the client-side

app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Redirect all traffic to index.html

app.get("/home", function(req, res){
   //res.sendFile(`${__dirname}/Frontend/login.html`);
   res.render("login"); // index refers to index.ejs
});

app.get("/dashboard", function(req, res){
   res.sendFile(`${__dirname}/Frontend/dashboard/dashboard.html`);
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


app.post('/signup', function(req, res)
{
//andre
});
//Sessions

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : false}));
//app.use(bodyParser.json());

app.post('/auth', function(request, response) {
   console.log("start auth!")
   console.log(request.body.name);
   console.log(request.body.password);
	var username = request.body.name;
	var password = request.body.password;

   
   console.log(username, password);
	if (username && password) {
      console.log("start DB-Query!");
      MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {

         if (err) throw err;
         db = client.db("trainer");
         db.collection("user").find({account:username, password:password}).toArray().then(json => {

            if (json.length > 0) {
               console.log(json[0].account);
               request.session.loggedin = true;
               request.session.username = username;
               console.log(request.session); // variable mit Session
               //response.send({explanation: "Correct Username and Password!", 
               //success: false });
               response.redirect('/dashboard');
               response
            } else {
				response.render("failure");
            }			
            response.end();
         });
      });
      
	}
   else {
		response.send({success: false});
		response.end();
   };
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
         case "call": 
            console.log("User logged in", data.name); 
				
            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               sendTo(connection, { 
                  type: "call", 
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

