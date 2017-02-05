// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
"use strict";
// In the renderer process.
const electron = require('electron');
const fs = require('fs');
const which = require('which');
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;

function getPythonPath() {
    if (process.platform === 'win32') {
        if (fs.existsSync(`${process.env.USERPROFILE}\\Anaconda3\\python.exe`)) {
            return `${process.env.USERPROFILE}\\Anaconda3\\python.exe`.replace(/\\/g, "/");
        }
    } else {
        // macOS,Linux
        let pythonBin;
        try {
            pythonBin = which.sync('python3');
        } catch (e) {
            try {
                pythonBin = which.sync('python');
            } catch (e2) {

            }
        }
        return pythonBin;
    }
}

function getTfHome(pythonBin) {
    const buf = execSync(`${pythonBin} -c"import site;print(site.getsitepackages())"`);
    const libs = buf.toString().replace(/\\\\/g, "/").replace(/'/g, "").replace(/\[/, "").replace(/\]/, "").replace(/\n/, "").split(",");

    for (let i = 0; i < libs.length; i++) {
        console.log(libs[i]);
        if (fs.existsSync(`${libs[i].trim()}/tensorflow`)) {
            return libs[i];
        }
    }
    return "";
}

function getImageBlob() {

}

function getExif(buffer) {
    console.log(buffer.length)
    const oFile = new BinaryFile(buffer);
    const iLength = oFile.getLength();
    const iOffset = 2;
    const oEXIF = EXIF.readFromBinaryFile(oFile);

    EXIF.bDebug = true;
    return oEXIF;
}

function getCorrectOrientationImage(img, orientation, w, h) {
    const c2 = document.createElement("canvas");
    c2.width = img.width;
    c2.height = img.height;
    let rotD = 0;
    if (orientation == 1) {
        c2.width = img.width;
        c2.height = img.height;
        rotD = 0;
    } else if (orientation == 6) {
        c2.width = img.height;
        c2.height = img.width;
        rotD = 90;
    } else if (orientation == 8) {
        c2.width = img.height;
        c2.height = img.width;
        rotD = 270;
    } else if (orientation == 3) {
        c2.width = img.height;
        c2.height = img.width;
        rotD = 180;
    }
    const c2ctx = c2.getContext("2d");
    c2ctx.save();

    // 平行移動
    c2ctx.translate(w / 2, h / 2);

    // 回転
    const rot = rotD / 180 * Math.PI;
    c2ctx.rotate(rot);

    // 平行移動
    c2ctx.translate(-w / 2, -h / 2);
    c2ctx.drawImage(img, 0, 0, w, h);

    c2ctx.restore();
    return c2ctx.getImageData(0, 0, w, h);
}

const sendBtn = document.getElementById("sendBtn");
sendBtn.addEventListener('click', () => {
    const url = "";
    fetch(url, {
        method: 'POST',
        body: getImageBlob()
    }).then((res) => {
        return res.json();
    }).then((json) => {
        console.dir(json);
    });
}, false);
const pythonBin = getPythonPath();
const tfHome = getTfHome(pythonBin);
const con = document.getElementById("con");

con.innerHTML = "";

//ドロップされるエリアの取得
const dropArea = document.getElementById('dropImg');

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
}, false);

dropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
}, false);

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file.type.match(/image\/jpeg/)) {
        // 指定したファイル以外の場合、処理を続行しない。
        e.stopPropagation();
        return false;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        con.innerText = 'Reader onload start';

        const buffer = new Uint8Array(reader.result);
        const oEXIF = getExif(buffer);
        const canvas = document.getElementById("world");
        const img = new Image();

        img.onload = function () {
            canvas.width = 512;
            canvas.height = 512;
            if (img.width > img.height) {
                canvas.height = canvas.width * (img.height / img.width);
            } else {
                canvas.width = canvas.height * (img.width / img.height);
            }
            const ctx = canvas.getContext("2d");
            if (oEXIF) {
                ctx.putImageData(getCorrectOrientationImage(img, oEXIF.Orientation, canvas.width, canvas.height), 0, 0);
            } else {
                ctx.putImageData(getCorrectOrientationImage(img, 0, canvas.width, canvas.height), 0, 0);
            }
            const d64str = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");
            const imagePath = `${__dirname}/dropImage.jpg`.replace(/\\\\/g, "/");
            fs.writeFileSync(imagePath, d64str, {
                encoding: 'base64'
            });

            exec(`${pythonBin} ${tfHome}/tensorflow/models/image/imagenet/classify_image.py --image_file ${imagePath}`, (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);

                con.innerText = stdout;
            });

        }
        img.src = URL.createObjectURL(new Blob([buffer], {
            type: "image/jpeg"
        }));
        con.innerText = "かんがえちゅう。。。";
    };
    reader.readAsArrayBuffer(file);
    e.stopPropagation();
    con.innerText = "Drop end";
}, false);