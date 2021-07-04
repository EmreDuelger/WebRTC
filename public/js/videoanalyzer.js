/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

var localVideo = document.querySelector('#localVideo');
var localVideoCanvas = document.querySelector('#localVideoCanvas');

var stream;

var videoheight = 640;
var videowidth = 853;

var poseconfidence = 0.3;
var partconfidence = 0.3;
var poses = new Array();
var estimate = false;
document.getElementById("downloadbutton").textContent = 'Download ' + poses.length + ' Poses (JSON)';

const h1_exerciseName = document.getElementById('exerciseName');
const h2_goal = document.getElementById('goal');
const h2_counter = document.getElementById('counter');
const h4_following = document.getElementById('following');

const color = "aqua";
const boundingBoxColor = "red";
const lineWidth = 2;

var net = null;
var changeModel = false;
var modeltype = "speed";

var workout = null;
var current_exercise = null;
var current_exercise_pose = null;

var labels = [1];
var leftLegAngle = [0];
var rightLegAngle = [0];
var leftHipKneeYDif = [0];
var rightHipKneeYDif = [0];

var roll_5_median_leftLegAngle = [0, 0, 0, 0, 0];
var roll_5_median_rightLegAngle = [0, 0, 0, 0, 0];
var roll_5_median_leftHipKneeYDif = [0, 0, 0, 0, 0];
var roll_5_median_rightHipKneeYDif = [0, 0, 0, 0, 0];

const canvas_leftLegAngle = document.getElementById('chart_leftLegAngle');
const chart_leftLegAngle = new Chart(canvas_leftLegAngle, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "leftLegAngle",
         data: leftLegAngle,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: true,
      animation: false
   }
});
const canvas_rightLegAngle = document.getElementById('chart_rightLegAngle');
const chart_rightLegAngle = new Chart(canvas_rightLegAngle, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "rightLegAngle",
         data: rightLegAngle,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: true,
      animation: false
   }
});
const canvas_leftHipKneeYDif = document.getElementById('chart_leftHipKneeYDif');
const chart_leftHipKneeYDif = new Chart(canvas_leftHipKneeYDif, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "leftHipKneeYDif",
         data: leftHipKneeYDif,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: true,
      animation: false
   }
});
const canvas_rightHipKneeYDif = document.getElementById('chart_rightHipKneeYDif');
const chart_rightHipKneeYDif = new Chart(canvas_rightHipKneeYDif, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "rightHipKneeYDif",
         data: rightHipKneeYDif,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: true,
      animation: false
   }
});


const speed = {
   architecture: 'MobileNetV1',
   outputStride: 16,
   inputResolution: 200,
   multiplier: 0.5
};
const mixed = {
   architecture: 'MobileNetV1',
   outputStride: 16,
   inputResolution: 500,
   multiplier: 0.75
};
const accuracy = {
   architecture: 'ResNet50',
   outputStride: 32,
   inputResolution: 500,
   quantBytes: 2
};

function toggleLoadingUI(
   showLoadingUI, loadingDivId = 'loading', mainDivId = 'main') {
   if (showLoadingUI) {
      document.getElementById(loadingDivId).style.display = 'block';
      document.getElementById(mainDivId).style.display = 'none';
   } else {
      document.getElementById(loadingDivId).style.display = 'none';
      document.getElementById(mainDivId).style.display = 'block';
   }
}

function toTuple({ y, x }) {
   return [y, x];
}
function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
   ctx.beginPath();
   ctx.moveTo(ax * scale, ay * scale);
   ctx.lineTo(bx * scale, by * scale);
   ctx.lineWidth = lineWidth;
   ctx.strokeStyle = color;
   ctx.stroke();
}
function drawPoint(ctx, y, x, r, color) {
   ctx.beginPath();
   ctx.arc(x, y, r, 0, 2 * Math.PI);
   ctx.fillStyle = color;
   ctx.fill();
}

function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
   const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
      keypoints,
      minConfidence
   );

   adjacentKeyPoints.forEach((keypoints) => {
      drawSegment(
         toTuple(keypoints[0].position),
         toTuple(keypoints[1].position),
         color,
         scale,
         ctx
      );
   });
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
   for (let i = 0; i < keypoints.length; i++) {
      const keypoint = keypoints[i];

      if (keypoint.score < minConfidence) {
         continue;
      }

      const { y, x } = keypoint.position;
      drawPoint(ctx, y * scale, x * scale, 3, color);
   }
}

function drawCanvas(pose) {

   const ctx = localVideoCanvas.getContext("2d");

   localVideoCanvas.width = videowidth;
   localVideoCanvas.height = videoheight;

   if (pose.score >= poseconfidence) {
      drawKeypoints(pose["keypoints"], partconfidence, ctx);
      drawSkeleton(pose["keypoints"], partconfidence, ctx);
   }
};

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

   chart_leftLegAngle.update();
   chart_rightLegAngle.update();
   chart_leftHipKneeYDif.update();
   chart_rightHipKneeYDif.update();

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

var repcount = 0;
var moved_to = false;
var moved_back = false;

function checkRepCount() {
   if (moved_to && moved_back) {
      repcount++;
      moved_back = false;
      moved_to = false;
      h2_counter.innerHTML = "Reps: " + repcount;
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

function highlightChart(param, color) {
   switch (param) {
      case "leftLegAngle":
         canvas_leftLegAngle.style.backgroundColor = color;
         break;
      case "rightLegAngle":
         canvas_rightLegAngle.style.backgroundColor = color;
         break;
      case "leftHipKneeYDif":
         canvas_leftHipKneeYDif.style.backgroundColor = color;
         break;
      case "rightHipKneeYDif":
         canvas_rightHipKneeYDif.style.backgroundColor = color;
         break;
      default:
         break;
   }
}

function evaluateExercise() {
   if (current_exercise !== null && current_exercise.params !== undefined) {
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
                  highlightChart(current_exercise.params[i].param, "lightgreen");
               } else {
                  highlightChart(current_exercise.params[i].param, "white");
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
                  highlightChart(current_exercise.params[i].param, "coral");
               } else {
                  highlightChart(current_exercise.params[i].param, "white");
               }
            }
         }
      }

      if (hits >= current_exercise.paramCountThreshold) {
         switchCurrentExercisePose();
      }
   }
}

function detectPose() {
   async function poseDetectionFrame() {
      if (changeModel) {
         // Important to purge variables and free up GPU memory
         net.dispose();
         toggleLoadingUI(true);
         switch (modeltype) {
            case "speed":
               net = await posenet.load(speed);
               break;
            case "mixed":
               net = await posenet.load(mixed);
               break;
            case "accuracy":
               net = await posenet.load(accuracy);
               break;
            default:
               break;
         }
         toggleLoadingUI(false);
         changeModel = false;
      }

      if (estimate) {
         var pose = await net.estimateSinglePose(localVideo);
         //console.log(pose);
         calculate_pose_metrics(pose);
         drawCanvas(pose);
         poses.push(pose);
         evaluateExercise();
         document.getElementById("downloadbutton").textContent = 'Download ' + poses.length + ' Poses (JSON)';
      }

      requestAnimationFrame(poseDetectionFrame);
   }

   poseDetectionFrame();
}

function captureVideo() {
   //getting local video stream 
   navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) {
      console.log('test')
      stream = myStream;

      const videoTracks = stream.getVideoTracks();
      window.stream = stream;
      //displaying local video stream on the page 
      localVideo.srcObject = stream;

      localVideo.height = videoheight;
      localVideo.width = videowidth;

   }, function (error) {
      console.log(error);
   })
};

async function bindPage() {
   toggleLoadingUI(true);
   net = await posenet.load(speed);
   toggleLoadingUI(false);

   captureVideo()
   if (localVideo) {
      localVideo.addEventListener('loadeddata', function () {
         console.log("Video loaded")
         detectPose()
      })
   };
}

function changeModelSelector(type) {
   changeModel = true;
   modeltype = type;
}

function changePoseConfidence(conf) {
   poseconfidence = conf;
}
function changePartConfidence(conf) {
   partconfidence = conf;
}

function togglePoseEstimation() {
   if (estimate) {
      document.getElementById("togglePoseEstimationButton").textContent = 'Start Estimation';
      estimate = false;
   }
   else {
      poses = new Array();
      document.getElementById("togglePoseEstimationButton").textContent = 'Stop Estimation';
      document.getElementById("downloadbutton").textContent = 'Download 0 Poses (JSON)';
      estimate = true;
   }
}

function DownloadJSON() {
   var content = JSON.stringify(poses);
   const a = document.createElement("a");
   const file = new Blob([content], { type: 'text/plain' });
   a.href = URL.createObjectURL(file);
   a.download = 'poses.json';
   a.click();
}

async function getWorkout() {
   return fetch('http://localhost:8080/workouts')
      .then((response) => response.json())
      .then((responseJson) => { return responseJson[0] });
};



// utility function that returns a promise that resolves after t milliseconds
function delay(t) {
   return new Promise(resolve => {
      setTimeout(resolve, t);
   });
}


var interval;

function check(goalValue) {
   if (repcount == goalValue) {
       console.log("check")

       // We don't need to interval the check function anymore,
       // clearInterval will stop its periodical execution.
       clearInterval(interval);
   }
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
   console.log(exercise.exerciseName + " started");
   current_exercise_pose = "neutral";
   current_exercise = exercise;
   togglePoseEstimation();
   switch (exercise.goalType) {
      case "time":
         for (let i = exercise.goalValue; i > 0; i--) {
            //print Timer            
            h2_goal.innerHTML = "Goal: " + i + " sek";
            await delay(1000);
         }
         break;
      case "count":
         h2_goal.innerHTML = "Goal: " + exercise.goalValue + " reps";
         do{
            await delay(500);
         } while (repcount < exercise.goalValue)
         break;
      default:
         //Finish
         break;
   }
   console.log(exercise.exerciseName + " finished");
   current_exercise = null;
   current_exercise_pose = null;
   togglePoseEstimation();
}

var workout_running = false;

async function runWorkout() {
   if (!workout_running) {
      workout_running = true;
      workout = await getWorkout();
      //setTitleOutput
      for (let i = 0; i < workout.exercises.length; i++) {
         await handleExercise(workout.exercises[i], workout.exercises[i + 1]);
      }
      workout_running = false;
   } else {
      console.log("workout is running");
   }
}