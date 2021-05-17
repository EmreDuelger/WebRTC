/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

//our username 
var name;

//****** 
//UI selectors block 
//******

var localVideo = document.querySelector('#localVideo');
var localVideoCanvas = document.querySelector('#localVideoCanvas');

var yourConn;
var stream;

const color = "aqua";
const boundingBoxColor = "red";
const lineWidth = 2;

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

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
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
 
 /**
  * Draw pose keypoints onto a canvas
  */
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
  
function captureVideo(){
   
      //getting local video stream 
      navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) {
         console.log('test')
         stream = myStream;

         const videoTracks = stream.getVideoTracks();
         window.stream = stream;
         //displaying local video stream on the page 
         localVideo.srcObject = stream;

      }, function (error) {
         console.log(error);
      })
};

const runPosenet = async () => {
   const net = await posenet.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      inputResolution: { width: 640, height: 480 },
      multiplier: 0.5
   });
   //
   setInterval(() => {
      detect(net);
   }, 100);
};

const detect = async (net) => {

   const video = document.getElementById('localVideo');

   video.width = 640;
   video.height = 480;

   // Make Detections
   const pose = await net.estimateSinglePose(video);
   console.log(pose);

   drawCanvas(pose);
};

const drawCanvas = (pose) => {
   const canvas = document.getElementById('localVideoCanvas');
   const ctx = canvas.getContext("2d");
   
   canvas.width = 640;
   canvas.height = 480;

   drawKeypoints(pose["keypoints"], 0.6, ctx);
   drawSkeleton(pose["keypoints"], 0.7, ctx);
 };

if(localVideo){
   localVideo.addEventListener('loadeddata', function(){
      console.log("Video loaded")
      runPosenet()
   })
};
   