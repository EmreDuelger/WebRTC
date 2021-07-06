/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';



//const { response } = require("express");

//const {data} = require("jquery");

//our username 
//var name = username;
var password;
var connectedUser;

//connecting to our signaling server
var conn = new WebSocket('ws://localhost:9090');

conn.onopen = function () {
   console.log("Connected to the signaling server");
};

//when we got a message from a signaling server 
conn.onmessage = function (msg) {
   console.log("Got message", msg.data);

   var data = JSON.parse(msg.data);

   switch (data.type) {
      //case "call":
      // handleLogin(data.success);
      // break;
      case "sign-up":
         handleSignup();//musst du ggf. anpassen.
         break;
      //when somebody wants to call us 
      case "offer":
         handleOffer(data.offer, data.name);
         break;
      case "answer":
         handleAnswer(data.answer);
         break;
      //when a remote peer sends an ice candidate to us 
      case "candidate":
         handleCandidate(data.candidate);
         break;
      case "leave":
         handleLeave();
         break;
      default:
         break;
   }
};

conn.onerror = function (err) {
   console.log("Got error", err);
};

//alias for sending JSON encoded messages 
function send(message) {
   //attach the other peer username to our messages 
   if (connectedUser) {
      message.name = connectedUser;
   }

   conn.send(JSON.stringify(message));
};

//****** 
//UI selectors block 
//******

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var userpasswordInput = document.querySelector('#userpasswordInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');

var signupdBtn = document.querySelector('#signupdBtn');

var hangUpBtn = document.querySelector('#hangUpBtn');

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

var yourConn;
var stream;


// Login when the user clicks the button
/*if(loginBtn){
   loginBtn.addEventListener("click", function (event) {
      console.log("clicked!");
      name = usernameInput.value;
      password = userpasswordInput.value;
      console.log(name);
      console.log(password);
      if (name.length > 0 && password.length > 0) {
         const Data= {"username": name, "password": password}
         const otheparam ={
         headers: {
            "content-type":"application/json; charset=UTF-8"
         },
         body:Data,
         method:"POST"   
     };
         console.log(otheparam.body);
         fetch("http://localhost:8080/auth", otheparam)
         .then(data=>{console.log(data.data)})
         .then(res=>{console.log(res)})
         //$.post("/auth", {"username": name, "password": password});
         console.log("Name and password are correct.")
      } else {
         alert("Ooops...Please enter account and password or sign-up!");

      }

   })};*/

/*function handleLogin(success) { 
   if (success === false) { 
      console.log("if", success);
      alert("Ooops...try a different username");

   } else { 
      console.log("else", success);
      //loginPage.style.display = "none"; 
      alert("Websocket-Connection established!");
      //callPage.style.display = "block";
      //captureVideo();

     // window.location = "/dashboard";

      //console.log('test')
      //********************** 
      //Starting a peer connection 
      //********************** 
      //using Google public stun server 
      
   }
};*/



function captureVideo() {



   // if (success === false) { 
   //  console.log("if", success);
   // alert("Login failed");

   //}


   //send({ 
   //  type: "call", 
   // name: name 
   //  }); 


   //getting local video stream 
   navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) {

      console.log('STARTING LOCALVIDEO')
      stream = myStream;

      const videoTracks = stream.getVideoTracks();
      window.stream = stream;
      //displaying local video stream on the page 
      localVideo.srcObject = stream;

      localVideo.height = 480;
      localVideo.width = 640;


      //using Google public stun server 
      var configuration = {
         "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
      };

      yourConn = new webkitRTCPeerConnection(configuration);

      // setup stream listening 
      yourConn.addStream(stream);

      //when a remote user adds stream to the peer connection, we display it 
      yourConn.onaddstream = function (e) {

         //displaying remote video stream on the page 
         remoteVideo.srcObject = e.stream;

      };

      // Setup ice handling 
      yourConn.onicecandidate = function (event) {
         if (event.candidate) {
            send({
               type: "candidate",
               candidate: event.candidate
            });
         }
      };

   }, function (error) {
      console.log(error);
   })
};

//initiating a call 

if (callBtn) {
   callBtn.addEventListener("click", function () {
      //var callToUsername = callToUsernameInput.value;
      var sel = document.getElementById('myList').value;
      console.log(sel);

      if (/*callToUsername.length > 0 ||*/ sel.length > 0) {

        // if(callToUsername.length > 0){
            //connectedUser = callToUsername;
         //}else{
            connectedUser = sel;
       //  }
            

         // create an offer 
         yourConn.createOffer(function (offer) {
            send({
               type: "offer",
               offer: offer
            });

            yourConn.setLocalDescription(offer);
         }, function (error) {
            alert("Error when creating an offer");
         });

      }
   })
};

//when somebody sends us an offer 
function handleOffer(offer, name) {
   connectedUser = name;
   yourConn.setRemoteDescription(new RTCSessionDescription(offer));

   //create an answer to an offer 
   yourConn.createAnswer(function (answer) {
      yourConn.setLocalDescription(answer);

      send({
         type: "answer",
         answer: answer
      });

   }, function (error) {
      alert("Error when creating an answer");
   });
};

//when we got an answer from a remote user
function handleAnswer(answer) {
   yourConn.setRemoteDescription(new RTCSessionDescription(answer));
};

//when we got an ice candidate from a remote user 
function handleCandidate(candidate) {
   yourConn.addIceCandidate(new RTCIceCandidate(candidate));
};

//hang up
if (hangUpBtn) {
   hangUpBtn.addEventListener("click", function () {

      send({
         type: "leave"
      });

      handleLeave();
   })
};

function handleLeave() {
   connectedUser = null;
   remoteVideo.srcObject = null;


   yourConn.close();
   yourConn.onicecandidate = null;
   yourConn.onaddstream = null;
};

var firstclick = 0;
var list = [];

function getList() {
   fetch('http://localhost:8080/users')
      .then(function (res) {
         //console.log(res.json());
         return res.json();
         //console.log(res.json());
      })
      .then(function (data) {
         const items = data;
         console.log(items.users.length)
         list = items.users;
      })
      .catch(function (error) {

      });
};

function getUsers() {

   getList();

   var users = document.getElementById('myList');

   //console.log(list);
   var opt = null;
   var i = 0;

   if (firstclick == 0) {
      console.log(firstclick);
      for (i = 0; i < list.length; i++) {
         opt = document.createElement('option');
         //console.log(list[i]);
         opt.value = list[i];
         //console.log(opt.value);
         opt.innerHTML = list[i];
         users.appendChild(opt);
         firstclick = firstclick + 1;
         console.log(firstclick);
      }
   }
};

var net = null;
var modeltype = "speed";
const speed = {
   architecture: 'MobileNetV1',
   outputStride: 32,
   inputResolution: { width: 640, height: 480 },
   multiplier: 0.5
};
const mixed = {
   architecture: 'MobileNetV1',
   outputStride: 16,
   inputResolution: { width: 640, height: 480 },
   multiplier: 0.75
};
const accuracy = {
   architecture: 'ResNet50',
   outputStride: 32,
   inputResolution: { width: 640, height: 480 },
   quantBytes: 2
};

function detectPose() {
   async function poseDetectionFrame() {

      var pose = await net.estimateSinglePose(localVideo);
      console.log(pose);

      requestAnimationFrame(poseDetectionFrame);
   }

   poseDetectionFrame();
}

async function loadPosenet()  {
   switch (modeltype) {
      case 'speed':
         net = await posenet.load(speed);
         break;
      case 'mixed':
         net = await posenet.load(mixed);
         break;
      case 'accuracy':
         net = await posenet.load(accuracy);
         break;
      default:
         break;
   }
   detectPose();
}

if (localVideo) {
   localVideo.addEventListener('loadeddata', function () {
      console.log("Video loaded")
      loadPosenet();
   })
};



