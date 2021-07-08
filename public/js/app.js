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
var serverIP = '192.168.178.31' //your server-IP or 'localhost' when running locally 192.168.178.21

//Status Variables
var estimate = false;
var workout_running = false;
var net = null;
const speed = {
   architecture: 'MobileNetV1',
   outputStride: 16,
   inputResolution: 200,
   multiplier: 0.5
};
var videoheight = 640;
var videowidth = 853;
var poseconfidence = 0.3;
var partconfidence = 0.3;

var workout = null;
var current_exercise = null;
var current_exercise_pose = null;
var repcount = 0;
var moved_to = false;
var moved_back = false;

var labels = [1];
var leftLegAngle = [0];
var rightLegAngle = [0];
var leftHipKneeYDif = [0];
var rightHipKneeYDif = [0];

var roll_5_median_leftLegAngle = [0, 0, 0, 0, 0];
var roll_5_median_rightLegAngle = [0, 0, 0, 0, 0];
var roll_5_median_leftHipKneeYDif = [0, 0, 0, 0, 0];
var roll_5_median_rightHipKneeYDif = [0, 0, 0, 0, 0];

//connecting to our signaling server
var conn = new WebSocket('ws://' + serverIP + ':9090');

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
      case "startWorkout":
         runWorkout(false);
         break;
      case "repCount":
         handleGuestRepCount(data.repCount);
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

const div_videoGridLocal = document.getElementById('videoGridLocal');
const div_videoGridGuest = document.getElementById('videoGridGuest');
const div_videoGridCall = document.getElementById('videoGridCall');
const div_videoGridWorkout = document.getElementById('videoGridWorkout');

const h1_exerciseName = document.getElementById('exerciseName');
const h1_guestName = document.getElementById('guestName');
const btn_workoutButton = document.getElementById('workoutButton');
const h2_goal = document.getElementById('goal');
const h2_counter = document.getElementById('counter');
const h2_guestCounter = document.getElementById('guestCounter');
const h4_following = document.getElementById('following');

var yourConn;
var stream;

function captureVideo() {

   //getting local video stream 
   navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) {

      console.log('STARTING LOCALVIDEO')
      stream = myStream;

      const videoTracks = stream.getVideoTracks();
      window.stream = stream;
      //displaying local video stream on the page 
      localVideo.srcObject = stream;

      localVideo.height = videoheight;
      localVideo.width = videowidth;


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
         div_videoGridGuest.style.display = '';
         div_videoGridCall.style.display = 'none';


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

//when somebody sends us an offer 
function handleOffer(offer, name) {
   connectedUser = name;
   h1_guestName.innerHTML = connectedUser;
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

function handleLeave() {
   connectedUser = null;
   remoteVideo.srcObject = null;


   yourConn.close();
   yourConn.onicecandidate = null;
   yourConn.onaddstream = null;

   div_videoGridGuest.style.display = 'none';
   div_videoGridCall.style.display = '';
};

function handleGuestRepCount(guestRepCount) {
   h2_guestCounter.innerHTML = "Reps: " + guestRepCount;
}

//Helper Functions
function delay(t) {
   return new Promise(resolve => {
      setTimeout(resolve, t);
   });
}

function togglePoseEstimation() {
   if (estimate) {
      estimate = false;
   }
   else {
      estimate = true;
   }
}

function find_point(pose, p) {
   const points = pose["keypoints"];
   for (let i = 0; i < points.length; i++) {
      const keypoint = points[i];

      if (keypoint.part == p && keypoint.score >= 0.5) {
         return [Math.round(keypoint.position.x), Math.round(keypoint.position.y)];
      }
   }
   return null;
}

function xDif(p0, p1) {
   if (p0 !== null && p1 !== null) {
      return p0[0] - p1[0];
   } else {
      return null;
   }
}

function yDif(p0, p1) {
   if (p0 !== null && p1 !== null) {
      return p0[1] - p1[1];
   } else {
      return null;
   }
}

function euclidian(p0, p1) {
   if (p0 !== null && p1 !== null) {
      return Math.sqrt(xDif(p0, p1) ** 2 + yDif(p0, p1) ** 2);
   } else {
      return null;
   }
}

function angle_calc(p0, p1, p2) {
   if (p0 !== null && p1 !== null && p2 !== null) {
      var angle = 0;
      try {
         var a = (p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2
         var b = (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2
         var c = (p2[0] - p0[0]) ** 2 + (p2[1] - p0[1]) ** 2
         angle = Math.acos((a + b - c) / Math.sqrt(4 * a * b)) * 180 / Math.PI
      } catch (error) {
         return 0;
      }
      return Math.round(angle)
   } else {
      return null;
   }
}

function median(values) {

   const sorted = [...values].sort(function (a, b) { return a - b; });

   var half = Math.floor(sorted.length / 2);

   if (sorted.length % 2)
      return sorted[half];
   else
      return (sorted[half - 1] + sorted[half]) / 2.0;
}

function calculate_pose_metrics(pose) {
   const leftHip = find_point(pose, 'leftHip');
   const rightHip = find_point(pose, 'rightHip');
   const leftKnee = find_point(pose, 'leftKnee');
   const rightKnee = find_point(pose, 'rightKnee');
   const leftAnkle = find_point(pose, 'leftAnkle');
   const rightAnkle = find_point(pose, 'rightAnkle');


   roll_5_median_leftLegAngle.push(angle_calc(leftHip, leftKnee, leftAnkle));
   roll_5_median_rightLegAngle.push(angle_calc(rightHip, rightKnee, rightAnkle));
   roll_5_median_leftHipKneeYDif.push(yDif(leftHip, leftKnee));
   roll_5_median_rightHipKneeYDif.push(yDif(rightHip, rightKnee));

   roll_5_median_leftLegAngle.shift();
   roll_5_median_rightLegAngle.shift();
   roll_5_median_leftHipKneeYDif.shift();
   roll_5_median_rightHipKneeYDif.shift();

   leftLegAngle.push(median(roll_5_median_leftLegAngle))
   rightLegAngle.push(median(roll_5_median_rightLegAngle));
   leftHipKneeYDif.push(median(roll_5_median_leftHipKneeYDif));
   rightHipKneeYDif.push(median(roll_5_median_rightHipKneeYDif));

   labels.push(Math.max(...labels) + 1);

   if (labels.length > 500) {
      labels.shift();
      leftLegAngle.shift();
      rightLegAngle.shift();
      leftHipKneeYDif.shift();
      rightHipKneeYDif.shift();
   }
}

function getCurrentMetric(param) {
   switch (param) {
      case "leftLegAngle":
         return leftLegAngle[leftLegAngle.length - 1];
      case "rightLegAngle":
         return rightLegAngle[rightLegAngle.length - 1];
      case "leftHipKneeYDif":
         return leftHipKneeYDif[leftHipKneeYDif.length - 1];
      case "rightHipKneeYDif":
         return rightHipKneeYDif[rightHipKneeYDif.length - 1];
      default:
         return null;
   }
}

function checkRepCount() {
   if (moved_to && moved_back) {
      repcount++;
      moved_back = false;
      moved_to = false;
      h2_counter.innerHTML = "Reps: " + repcount;
      send({
         type: "repCount",
         repCount: repcount
      });
   }
}

function switchCurrentExercisePose() {
   switch (current_exercise_pose) {
      case "movement":
         current_exercise_pose = "neutral";
         moved_back = true;
         break;
      case "neutral":
         current_exercise_pose = "movement";
         moved_to = true;
         break;
      default:
         break;
   }

   checkRepCount();

   console.log("Current Pose: " + current_exercise_pose);
}

function evaluateExercise() {
  // if (current_exercise !== null && current_exercise.params !== undefined) {
      var hits = 0;
      if (current_exercise_pose == 'neutral') {
         for (let i = 0; i < current_exercise.params.length; i++) {
            var hit = false;
            var metric = getCurrentMetric(current_exercise.params[i].param);
            if (metric !== null) {
               switch (current_exercise.params[i].type) {
                  case "drop":
                     if (metric < current_exercise.params[i].movement) {
                        hit = true;
                     }
                     break;
                  case "rise":
                     if (metric > current_exercise.params[i].movement) {
                        hit = true;
                     }
                     break;
                  default:
                     break;
               }
               if (hit) {
                  hits++;
               }
            }
         }
      }
      if (current_exercise_pose == 'movement') {
         for (let i = 0; i < current_exercise.params.length; i++) {
            var hit = false;
            var metric = getCurrentMetric(current_exercise.params[i].param);
            if (metric !== null) {
               switch (current_exercise.params[i].type) {
                  case "drop":
                     if (metric > current_exercise.params[i].neutral) {
                        hit = true;
                     }
                     break;
                  case "rise":
                     if (metric < current_exercise.params[i].neutral) {
                        hit = true;
                     }
                     break;
                  default:
                     break;
               }
               if (hit) {
                  hits++;
               } else {
               }
            }
         }
      }

      if (hits >= current_exercise.paramCountThreshold) {
         switchCurrentExercisePose();
      }
   //}
}

function detectPose() {
   async function poseDetectionFrame() {

      if (current_exercise !== null && current_exercise.params !== undefined) {
         var pose = await net.estimateSinglePose(localVideo);
         console.log(pose);
         calculate_pose_metrics(pose);
         evaluateExercise();
      }

      requestAnimationFrame(poseDetectionFrame);
   }

   poseDetectionFrame();
}

async function handleExercise(exercise, following) {
   h1_exerciseName.innerHTML = exercise.exerciseName;
   if (following !== undefined) {
      h4_following.innerHTML = "Following: " + following.exerciseName;
   } else {
      h4_following.innerHTML = "";
   }
   repcount = 0;
   h2_counter.innerHTML = "";
   h2_guestCounter.innerHTML = "";
   console.log(exercise.exerciseName + " started");
   current_exercise_pose = "neutral";
   current_exercise = exercise;

   switch (exercise.goalType) {
      case "time":

         //togglePoseEstimation();
         for (let i = exercise.goalValue; i > 0; i--) {
            //print Timer            
            h2_goal.innerHTML = "Goal: " + i + " sek";
            await delay(1000);
         }
         //togglePoseEstimation();
         break;
      case "count":

         //togglePoseEstimation();
         h2_goal.innerHTML = "Goal: " + exercise.goalValue + " reps";
         do {
            await delay(500);
         } while (repcount < exercise.goalValue)
         //togglePoseEstimation();
         break;
      default:
         //Finish
         break;
   }
   console.log(exercise.exerciseName + " finished");
   current_exercise = null;
   current_exercise_pose = null;

}

async function getWorkout() {
   return fetch('http://' + serverIP + ':8080/workouts', { credentials: 'include' })
      .then((response) => response.json())
      .then((responseJson) => { return responseJson[0] });
};

async function runWorkout(isHost) {
   if (!workout_running) {
      if (isHost) {
         send({
            type: "startWorkout"
         });
      }
      workout_running = true;
      btn_workoutButton.style.display = "none";

      //setTitleOutput
      for (let i = 0; i < workout.exercises.length; i++) {
         await handleExercise(workout.exercises[i], workout.exercises[i + 1]);
      }
      workout_running = false;
      btn_workoutButton.style.display = "";
   } else {
      console.log("workout is running");
   }
   
}

async function bindPage() {

   //initiating a call 
   if (callBtn) {
      callBtn.addEventListener("click", function () {
         var sel = document.getElementById('myList').value;
         console.log(sel);

         if (sel.length > 0) {

            connectedUser = sel;
            h1_guestName.innerHTML = connectedUser;
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

   //hang up
   if (hangUpBtn) {
      hangUpBtn.addEventListener("click", function () {

         send({
            type: "leave"
         });

         handleLeave();
      })
   };

   workout = await getWorkout();
   net = await posenet.load(speed);

   captureVideo();

   if (localVideo) {
      localVideo.addEventListener('loadeddata', function () {
         console.log("Video loaded")
         detectPose();
      })
   };
}


