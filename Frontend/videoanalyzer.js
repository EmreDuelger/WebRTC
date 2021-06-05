/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

var fileVideo = document.querySelector('#fileVideo');
var localVideo = document.querySelector('#localVideo');
var localVideoCanvas = document.querySelector('#localVideoCanvas');

var stream;

var videoheight = 480;
var videowidth = 640;

var poseconfidence = 0.3;
var partconfidence = 0.3;
var poses = new Array();
document.getElementById("downloadbutton").textContent = 'Download ' + poses.length + ' Poses (JSON)';

const color = "aqua";
const boundingBoxColor = "red";
const lineWidth = 2;

var net = null;
var changeModel = false;
var modeltype = "speed";
var videotype = "webcam";

const speed = {
   architecture: 'MobileNetV1',
   outputStride: 16,
   inputResolution: { width: videowidth, height: videoheight },
   multiplier: 0.5
};
const mixed = {
   architecture: 'MobileNetV1',
   outputStride: 16,
   inputResolution: { width: videowidth, height: videoheight },
   multiplier: 0.75
};
const accuracy = {
   architecture: 'ResNet50',
   outputStride: 32,
   inputResolution: { width: videowidth, height: videoheight },
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

      switch (videotype) {
         case "webcam":
            var pose = await net.estimateSinglePose(localVideo);
            console.log(pose);
            drawCanvas(pose);
            break;
         case "file":
            if (fileVideo.readyState === 4 && !fileVideo.paused && !fileVideo.ended) {
               var pose = await net.estimateSinglePose(fileVideo);
               console.log(pose);
               drawCanvas(pose);
               //Build a JSON array containing pose records.
               poses.push(pose);
               document.getElementById("downloadbutton").textContent = 'Download ' + poses.length + ' Poses (JSON)';
            }
            break;
         default:
            break;
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

function changeVideotypeSelector(type) {
   switch (type) {
      case "webcam":
         localVideo.style.display = 'block';
         fileVideo.style.display = 'none';
         document.getElementById("fileselector").style.display = 'none';
         document.getElementById("playbutton").style.display = 'none';
         document.getElementById("downloadbutton").style.display = 'none';
         document.getElementById("fileselector").file = '';
         break;
      case "file":
         localVideo.style.display = 'none';
         fileVideo.style.display = 'block';
         document.getElementById("fileselector").style.display = 'block';
         document.getElementById("playbutton").style.display = 'block';
         document.getElementById("downloadbutton").style.display = 'block';
         fileVideo.height = videoheight;
         fileVideo.width = videowidth;

         break;
      default:
         break;
   }
   videotype = type;
}

function playSelectedFile(file) {
   var type = file.type;
   var canPlay = fileVideo.canPlayType(type);
   if (canPlay === '') canPlay = 'no';
   var message = 'Can play type "' + type + '": ' + canPlay;
   var isError = canPlay === 'no';
   if (isError) {
      return;
   }

   var fileURL = URL.createObjectURL(file);
   fileVideo.src = fileURL;
   poses = new Array();
   document.getElementById("downloadbutton").textContent = 'Download ' + poses.length + ' Poses (JSON)';
}

function togglePlay() {
   if (fileVideo.paused || fileVideo.ended) {
      fileVideo.play();
   } else {
      fileVideo.pause();
   }
}

function changePoseConfidence(conf) {
   poseconfidence = conf;
}
function changePartConfidence(conf) {
   partconfidence = conf;
}

function DownloadJSON() {
   var content = JSON.stringify(poses);
   const a = document.createElement("a");
   const file = new Blob([content], { type: 'text/plain' });
   a.href = URL.createObjectURL(file);
   a.download = 'poses.json';
   a.click();
}