//require our websocket library 
var WebSocketServer = require('ws').Server;
var listening_to_port = 8080;
//var keys;
//creating a websocket server at port 9090 
var wss = new WebSocketServer({ port: 9090 });

const express = require("express");
const app = express();

const session = require("express-session");
const passport = require("passport");

const http = require("http");
const server = http.createServer(app, wss);

var bodyParser = require('body-parser');
var path = require('path');

var MongoDBStore = require('connect-mongodb-session')(session);
var store = new MongoDBStore({
   uri: 'mongodb://localhost:27017/trainer',
   collection: 'sessions'
});

server.listen(listening_to_port, () => {
   console.log(`server started on http://localhost:${listening_to_port}`);
});


// URL at which MongoDB service is running
var url = "mongodb://localhost:27017";

// A Client to MongoDB
var MongoClient = require('mongodb').MongoClient;

//MongoDB-Connection
const client = new MongoClient(url, { useUnifiedTopology: true }); // useUnifiedTopology removes a warning

var db;

//all connected to the server users 
var users = {};

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

//Session Storing
app.use(session({
   secret: 'secret',
   store: store,
   resave: true,//vorher true
   saveUninitialized: true
}));

var cors = require('cors');
app.use(cors());

app.set("view engine", "ejs");

// use express static to deliver resources HTML, CSS, JS, etc)
// from the public folder

app.use(express.static(__dirname));

app.use(express.static(path.join(__dirname, "public")));

// Provide access to node_modules folder from the client-side
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Redirect all traffic to index.html

app.get("/home", function (req, res) {
   //res.sendFile(`${__dirname}/Frontend/login.html`);
   res.render("signup"); // index refers to index.ejs
});

app.get("/workout", function (req, res) {

   if (req.session.loggedin) {


      //console.log(req.session.cookie.expires);
      res.render("workouts", {
         "username": req.session.username
      });
   }
   else {

      res.redirect("/home");
   }

});

app.post("/createworkout", function (req, res) {
   //res.sendFile(`${__dirname}/Frontend/dashboard/dashboard.html`);
   //console.log(req.session.cookie);
   if (req.session.loggedin) {

      console.log("start DB-Query!");
      MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {

         if (err) throw err;
         db = client.db("trainer");
         console.log(req.body.createworkout);
         db.collection("workoutroom").find({ name: req.body.createworkout }).toArray().then(json => {
            console.log(json);
            if (json.length > 0) {
               console.log("if!");
               res.render("failedtocreateworkout");
            }
            else {
               console.log("else!");
               console.log(req.session.createworkout);
               db.collection("workoutroom").insertOne({ "name": req.body.createworkout, "link": "http:localhost:8080/?" + req.body.createworkout, "participants": 0 }, function (err, success) {
                  console.log(success);
               });
               res.render("workout_ok");

            };
         })
      })
   }

});



app.get("/dashboard", function (req, res) {
   //res.sendFile(`${__dirname}/Frontend/dashboard/dashboard.html`);
   //console.log(req.session.cookie);

   if (req.session.loggedin) {

      const status = [];
      const workoutname = [];
      const workoutlink = [];
      const participants = [];

      console.log("start DB-Query!");
      MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {


         if (err) throw err;
         db = client.db("trainer");
         db.collection("workoutroom").find({}).toArray().then(workout => {

            if (workout.length > 0) {
               for (let f = 0; f < workout.length; f++) {
                  console.log(workout[f].name);
                  workoutname[f] = workout[f].name;
                  workoutlink[f] = workout[f].link;
                  participants[f] = workout[f].participants;
               }

            } else {
               workoutname[0] = "Create Workoutroom!";
               workoutlink[0] = "/";
               participants[0] = "/";
            }


         })
         db.collection("user").find({ account: req.session.username }).toArray().then(json => {

            if (json.length > 0) {
               //console.log(json[0].buddies)
               req.session.buddies = json[0].buddies;

               db.collection("sessions").find({}).toArray().then(sessions => {

                  //console.log(status);
                  for (let i = 0; i < req.session.buddies.length; i++) {

                     //console.log(sessions[0].session.loggedin);
                     // 0="Offline" ; 1="Online"
                     status.push(0);
                     // console.log(req.session.buddies.length);
                     for (let j = 0; j < sessions.length; j++) {
                        //console.log(sessions[j].session.username);
                        // console.log(req.session.buddies[i]);
                        if (req.session.buddies[i] == sessions[j].session.username) {
                           console.log("Treffer");
                           status[i] = 1;
                        } else {
                           console.log("kein Treffer")
                        }
                     }
                  }

                  req.session.status = status;
                  console.log(status);
                  res.render("dashboard", {
                     "buddies": req.session.buddies,
                     "status": status,
                     "workoutname": workoutname,
                     "workoutlink": workoutlink,
                     "participants": participants,
                     "username": req.session.username
                  })
               })

               console.log(req.session.buddies);

            }

         })

      })

   }
   else {
      res.redirect("/home");
   };
});

//console.log(req.isAuthenticated);


app.get("/videocall", function (req, res) {
   //res.sendFile(`${__dirname}/Frontend/videocall.html`);

   if (req.session.loggedin) {


      //console.log(req.session.cookie.expires);
      res.render("videocall", {
         "buddies": req.session.buddies,
         "status": req.session.status,
         "username": req.session.username
      });
   }
   else {

      res.redirect("/home");
   }



   //   var obj = users;
   // var keys = Object.keys(users);
   //console.log(keys);

   wss.on('connection', function (connection) {
      console.log("User logged in", req.session.username);

      //if anyone is logged in with this username then refuse 
      if (users[req.session.username]) {
         sendTo(connection, {
            type: "call",
            success: false
         });
      } else {
         //save user connection on the server 
         users[req.session.username] = connection;
         connection.name = req.session.username;
         console.log(req.session.username);
         console.log(users);
         sendTo(connection, {
            type: "call",
            success: true
         });
      }

      connection.on('message', function (message) {

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

            case "offer":
               //for ex. UserA wants to call UserB 
               console.log("Sending offer to: ", data.name);

               //if UserB exists then send him offer details 
               var conn = users[data.name];

               if (conn != null) {
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

               if (conn != null) {
                  connection.otherName = data.name;
                  sendTo(conn, {
                     type: "answer",
                     answer: data.answer
                  });
               }

               break;

            case "candidate":
               console.log("Sending candidate to:", data.name);
               var conn = users[data.name];

               if (conn != null) {
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
               if (conn != null) {
                  sendTo(conn, {
                     type: "leave"
                  });
               }

               break;

            case "startWorkout":
               console.log("Sending startWorkout to:", data.name);
               var conn = users[data.name];

               if (conn != null) {
                  sendTo(conn, {
                     type: "startWorkout"
                  });
               }

               break;

            case "repCount":
               console.log("Sending RepCount to:", data.name);
               var conn = users[data.name];

               if (conn != null) {
                  sendTo(conn, {
                     type: "repCount",
                     repCount: data.repCount
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
      connection.on("close", function () {

         if (connection.name) {
            delete users[connection.name];

            if (connection.otherName) {
               console.log("Disconnecting from ", connection.otherName);
               var conn = users[connection.otherName];
               conn.otherName = null;

               if (conn != null) {
                  sendTo(conn, {
                     type: "leave"
                  });
               }
            }
         }

      });
   });
});

app.get("/videoanalyzer", function (req, res) {


   if (req.session.loggedin) {


      //console.log(req.session.cookie.expires);
      res.render("videoanalyzer", {
         "username": req.session.username
      });
   }
   else {

      res.redirect("/home");
   }


});


app.get("/webrtcroom", function(req, res){

   if (req.session.loggedin) {
      res.render('webrtcroom',
      {
         "username": req.session.username
      });
   }
   else{
      res.redirect("/home");
   }

});

app.get("/workouts", function (req, res) {


   if (req.session.loggedin) {

      console.log("start DB-Query!");
      MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {

         if (err) throw err;
         db = client.db("trainer");
         db.collection("workouts").find({ name: "Double Squad Workout MVP" }).toArray().then(json => {

            if (json.length > 0) {
               console.log(json)
               res.json(json);
            }
         })
      })
   }
   else {

      res.redirect("/home");
   }


});


app.get('/users', function (req, res) {

   var obj = users;
   var keys = Object.keys(users);
   console.log(keys);
   res.send({ "users": keys });

});


app.post('/signup', function (request, response) {
   console.log("start signup!")
   //console.log(request);
   console.log(request.body.sname);



   MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {

      if (err) throw err;
      db = client.db("trainer");

      db.collection("user").find({ account: request.body.account }).toArray().then(json => {
         if (json.length > 0) {
            response.render("signup_fail");
         } else {
            console.log("Create new Account");
            // Notwendigkeit von Passwort und Account
            if (request.body.account && request.body.password) {
               var myobj = { account: request.body.account, password: request.body.password, name: request.body.name, surname: request.body.sname, age: "22", buddies: [] };
               db.collection("user").insertOne(myobj, function (err, res) {
                  console.log("User added");
                  response.render("signup_ok");
               })
            } else {
               response.render("signup_pw_acc");
            }

         }
      })


   })
});



//Sessions



//app.use(bodyParser.json());

// for Authentication
/*passport.use(new LocalStrategy(
   function(username, password, done) {
     User.findOne({ username: username }, function (err, user) {
       if (err) { return done(err); }
       if (!user) { return done(null, false); }
       if (!user.verifyPassword(password)) { return done(null, false); }
       return done(null, user);
     });
   }
 ));*/

app.post('/auth', function (request, response) {
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
         db.collection("user").find({ account: username, password: password }).toArray().then(json => {

            if (json.length > 0) {
               console.log(json[0]);
               request.session.loggedin = true;
               request.session.username = username;
               console.log(request.session.loggedin); // variable mit Session
               //Angabe der Cookie-Dauer
               var minutes = 100 * 60000;
               request.session.cookie.expires = new Date(Date.now() + minutes)
               request.session.cookie.maxAge = minutes;
               //request.session.success = 'You are successfully registered and logged in ' + username + '!';

               //response.send({explanation: "Correct Username and Password!", 
               //success: false });
               //response.redirect('/dashboard');// für die normale html-Seite
               //console.log(request.isAuthenticated());
               //response.render("dashboard", {
               //"username": username
               // });
               response.redirect("/dashboard");

            } else {
               response.render("failure");
            }
            response.end();
         });
      });

   }
   else {
      response.render("failure");
      response.end();
   };
});




//when a user connects to our server Websocket-Connecting
/*wss.on('connection', function(connection) {
  
   console.log("User connected", connection);
	
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
        /* case "call": 
            //console.log("User logged in", session.username); 
         	
            //if anyone is logged in with this username then refuse 
           / if(users[session.username]) { 
               sendTo(connection, { 
                  type: "call", 
                  success: false 
               }); 
            } else { 
               //save user connection on the server 
               users[session.username] = connection; 
               connection.name = session.username; 
               console.log(session.username);
               sendTo(connection, { 
                  type: "call", 
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
})*/

function sendTo(connection, message) {
   connection.send(JSON.stringify(message));
};

