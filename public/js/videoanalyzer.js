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

var videoheight = 640;
var videowidth = 853;

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

var labels = [1];
var leftLegAngle = [0];
var rightLegAngle = [0];
var leftUpperBodyDistance = [0];
var rightUpperBodyDistance = [0];
var shoulderDistance = [0];
var kneeDistance = [0];
var leftAnkleKneeXDif = [0];
var rightAnkleKneeXDif = [0];
var leftHipKneeYDif = [0];
var rightHipKneeYDif = [0];

var roll_5_median_leftLegAngle = [0,0,0,0,0];
var roll_5_median_rightLegAngle = [0,0,0,0,0];
var roll_5_median_leftUpperBodyDistance = [0,0,0,0,0];
var roll_5_median_rightUpperBodyDistance = [0,0,0,0,0];
var roll_5_median_shoulderDistance = [0,0,0,0,0];
var roll_5_median_kneeDistance = [0,0,0,0,0];
var roll_5_median_leftAnkleKneeXDif = [0,0,0,0,0];
var roll_5_median_rightAnkleKneeXDif = [0,0,0,0,0];
var roll_5_median_leftHipKneeYDif = [0,0,0,0,0];
var roll_5_median_rightHipKneeYDif = [0,0,0,0,0];

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
      responsive: false,
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
      responsive: false,
      animation: false
   }
});
const canvas_leftUpperBodyDistance = document.getElementById('chart_leftUpperBodyDistance');
const chart_leftUpperBodyDistance = new Chart(canvas_leftUpperBodyDistance, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "leftUpperBodyDistance",
         data: leftUpperBodyDistance,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: false,
      animation: false
   }
});
const canvas_rightUpperBodyDistance = document.getElementById('chart_rightUpperBodyDistance');
const chart_rightUpperBodyDistance = new Chart(canvas_rightUpperBodyDistance, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "rightUpperBodyDistance",
         data: rightUpperBodyDistance,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: false,
      animation: false
   }
});
const canvas_shoulderDistance = document.getElementById('chart_shoulderDistance');
const chart_shoulderDistance = new Chart(canvas_shoulderDistance, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "shoulderDistance",
         data: shoulderDistance,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: false,
      animation: false
   }
});
const canvas_kneeDistance = document.getElementById('chart_kneeDistance');
const chart_kneeDistance = new Chart(canvas_kneeDistance, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "kneeDistance",
         data: kneeDistance,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: false,
      animation: false
   }
});
const canvas_leftAnkleKneeXDif = document.getElementById('chart_leftAnkleKneeXDif');
const chart_leftAnkleKneeXDif = new Chart(canvas_leftAnkleKneeXDif, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "leftAnkleKneeXDif",
         data: leftAnkleKneeXDif,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: false,
      animation: false
   }
});
const canvas_rightAnkleKneeXDif = document.getElementById('chart_rightAnkleKneeXDif');
const chart_rightAnkleKneeXDif = new Chart(canvas_rightAnkleKneeXDif, {
   type: 'line',
   data: {
      labels: labels,
      datasets: [{
         label: "rightAnkleKneeXDif",
         data: rightAnkleKneeXDif,
         borderColor: 'rgb(75, 192, 192)',
         pointRadius: 0,

      }]
   },
   options: {
      responsive: false,
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
      responsive: false,
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
      responsive: false,
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
   return [0, 0];
}

function euclidian(point1, point2) {
   return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
}

function angle_calc(p0, p1, p2) {
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
}


function median(values) {

   const sorted = [...values].sort( function(a,b) {return a - b;} );

   var half = Math.floor(sorted.length/2);

   if(sorted.length % 2)
       return sorted[half];
   else
       return (sorted[half-1] + sorted[half]) / 2.0;
}

function calculate_pose_metrics(pose) {
   const leftShoulder = find_point(pose, 'leftShoulder');
   const rightShoulder = find_point(pose, 'rightShoulder');
   const leftHip = find_point(pose, 'leftHip');
   const rightHip = find_point(pose, 'rightHip');
   const leftKnee = find_point(pose, 'leftKnee');
   const rightKnee = find_point(pose, 'rightKnee');
   const leftAnkle = find_point(pose, 'leftAnkle');
   const rightAnkle = find_point(pose, 'rightAnkle');


   roll_5_median_leftLegAngle.push(angle_calc(leftHip, leftKnee, leftAnkle));
   roll_5_median_rightLegAngle.push(angle_calc(rightHip, rightKnee, rightAnkle));
   roll_5_median_leftUpperBodyDistance.push(euclidian(leftShoulder, leftHip));
   roll_5_median_rightUpperBodyDistance.push(euclidian(rightShoulder, rightHip));
   roll_5_median_shoulderDistance.push(euclidian(leftShoulder, rightShoulder));
   roll_5_median_kneeDistance.push(euclidian(leftKnee, rightKnee));
   roll_5_median_leftAnkleKneeXDif.push(leftAnkle[0] - leftKnee[0]);
   roll_5_median_rightAnkleKneeXDif.push(rightKnee[0] - rightAnkle[0]);
   roll_5_median_leftHipKneeYDif.push(leftHip[1] - leftKnee[1]);
   roll_5_median_rightHipKneeYDif.push(rightHip[1] - rightKnee[1]);

   roll_5_median_leftLegAngle.shift();
   roll_5_median_rightLegAngle.shift();
   roll_5_median_leftUpperBodyDistance.shift();
   roll_5_median_rightUpperBodyDistance.shift();
   roll_5_median_shoulderDistance.shift();
   roll_5_median_kneeDistance.shift();
   roll_5_median_leftAnkleKneeXDif.shift();
   roll_5_median_rightAnkleKneeXDif.shift();
   roll_5_median_leftHipKneeYDif.shift();
   roll_5_median_rightHipKneeYDif.shift();

   leftLegAngle.push(median(roll_5_median_leftLegAngle))
   rightLegAngle.push(median(roll_5_median_rightLegAngle));
   leftUpperBodyDistance.push(median(roll_5_median_leftUpperBodyDistance));
   rightUpperBodyDistance.push(median(roll_5_median_rightUpperBodyDistance));
   shoulderDistance.push(median(roll_5_median_shoulderDistance));
   kneeDistance.push(median(roll_5_median_kneeDistance));
   leftAnkleKneeXDif.push(median(roll_5_median_leftAnkleKneeXDif));
   rightAnkleKneeXDif.push(median(roll_5_median_rightAnkleKneeXDif));
   leftHipKneeYDif.push(median(roll_5_median_leftHipKneeYDif));
   rightHipKneeYDif.push(median(roll_5_median_rightHipKneeYDif));

   labels.push(Math.max(...labels)+1);

   if (labels.length > 500) {
      labels.shift();
      leftLegAngle.shift();
      rightLegAngle.shift();
      leftUpperBodyDistance.shift();
      rightUpperBodyDistance.shift();
      shoulderDistance.shift();
      kneeDistance.shift();
      leftAnkleKneeXDif.shift();
      rightAnkleKneeXDif.shift();
      leftHipKneeYDif.shift();
      rightHipKneeYDif.shift();
   }
      
   chart_leftLegAngle.update();
   chart_rightLegAngle.update();
   chart_leftUpperBodyDistance.update();
   chart_rightUpperBodyDistance.update();
   chart_shoulderDistance.update();
   chart_kneeDistance.update();
   chart_leftAnkleKneeXDif.update();
   chart_rightAnkleKneeXDif.update();
   chart_leftHipKneeYDif.update();
   chart_rightHipKneeYDif.update();

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

      switch (videotype) {
         case "webcam":
            var pose = await net.estimateSinglePose(localVideo);
            //console.log(pose);
            calculate_pose_metrics(pose);
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
   fileVideo.height = videoheight;
   fileVideo.width = videowidth;
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