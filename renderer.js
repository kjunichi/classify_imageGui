// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
"use strict";
// In the renderer process.
const electron = require('electron');
const fs = require('fs');
const which =require('which');
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;

function getPythonPath() {
    if(process.platform === 'win32') {
        if(fs.existsSync(`${process.env.USERPROFILE}\\Anaconda3\\python.exe`)) {
            return `${process.env.USERPROFILE}\\Anaconda3\\python.exe`.replace(/\\/g,"/");
        }
    } else {
        // macOS,Linux
    }
}
function getTfHome(pythonBin) {
    const buf = execSync(`${pythonBin} -c"import site;print(site.getsitepackages())"`);
    const libs = buf.toString().replace(/\\\\/g,"/").replace(/'/g,"").replace(/\[/,"").replace(/\]/,"").replace(/\n/,"").split(",");

    for(let i =0; i<libs.length; i++) {
        console.log(libs[i]);
        if(fs.existsSync(`${libs[i].trim()}/tensorflow`)) {
            return libs[i];
        }
    }
    return "";
}

const pythonBin = getPythonPath();
const tfHome = getTfHome(pythonBin);
    
const con = document.getElementById("con");

con.innerHTML = "";

const image = new Image();

image.onload = function () {
    console.log(`w,h = ${image.width},${image.height}`);
    const canvas = document.getElementById("world");
    const ctx = canvas.getContext("2d");
    //canvasのリサイズ
    canvas.width = 512;
    canvas.height = 512;
    if(image.width>image.height) {
        canvas.height = canvas.width*(image.height/image.width);
    } else {
        canvas.width = canvas.height*(image.width/image.height);
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    const d64str = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/,"");
    fs.writeFileSync(`${__dirname}\\dropImage.jpg`, d64str,{encoding: 'base64'});
    const imagePath = `${__dirname}\\dropImage.jpg`.replace(/\\/g,"/");
    
    exec(`${pythonBin} ${tfHome}/tensorflow/models/image/imagenet/classify_image.py --image_file ${imagePath}`, (err, stdout, stderr) => {
    if (err) {
        console.log(err);
    }
    console.log(stdout);
    
    con.innerText = stdout;
});

};

//ドロップされるエリアの取得
var dropArea = document.getElementById('dropImg');

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
}, false);

dropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
}, false);

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();

    
    var file = e.dataTransfer.files[0];
    if (!file.type.match(/image\/(jpeg|png|gif|svg)/)[1]) {
        // 指定したファイル以外の場合、処理を続行しない。
        e.stopPropagation();
        return false;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
        con.innerText = 'Reader onload start';
        const fileContent = reader.result;
        image.src = fileContent;
        con.innerText = "かんがえちゅう。。。";
    };

    reader.readAsDataURL(file);
    e.stopPropagation();
    con.innerText = "Drop end";
}, false);

/*
const exec = require('child_process').exec;
exec('c:/Users/kjw_j/anaconda3/python C:/Users/kjw_j/Anaconda3/Lib/site-packages/tensorflow/models/image/imagenet/classify_image.py', (err, stdout, stderr) => {
    if (err) {
        console.log(err);
    }
    console.log(stdout);
});
*/