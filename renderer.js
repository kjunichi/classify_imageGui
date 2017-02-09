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

function checkWebApi(cb) {
    const url = "http://127.0.0.1:8000/"
    fetch(url, {
        method: 'GET'
    }).then((res) => {
        return res.json();
    }).then((json) => {
        console.log(json);
        if (json.classify_image === "ok") {
            cb(true);
        } else {
            cb(false);
        }
    }).catch((e) => {
        console.log(e);
        cb(false);
    });
}

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

function getClassifyImagePy(tf) {
    tf = tf.replace(/\n/, "").replace(/^ /, "").replace(/\r/, "");
    const p = `${tf}/tensorflow/models/image/imagenet/classify_image.py`;
    if (fs.existsSync(p)) {
        return p;
    }
    return "./models/tutorials/image/imagenet/classify_image.py"
}

function getImageBlob(cb) {
    const c = document.getElementById("world");
    c.toBlob((blob) => {
        cb(blob);
    }, 'image/jpeg', 0.95)
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

function classify_image_local(canvas) {
    const d64str = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");
    const imagePath = `${__dirname}/dropImage.jpg`.replace(/\\\\/g, "/");
    fs.writeFileSync(imagePath, d64str, {
        encoding: 'base64'
    });
    
    exec(`${pythonBin} ${classifyImageScriptPath} --image_file ${imagePath}`, (err, stdout, stderr) => {
        if (err) {
            console.log(err);
        }
        console.log(stdout);

        con.innerText = stdout;
    });
}

function classify_image_web() {
    const url = "http://127.0.0.1:8000/";
    getImageBlob((blob) => {
        fetch(url, {
            method: 'POST',
            body: blob
        }).then((res) => {
            return res.json();
        }).then((json) => {
            console.dir(json);
            con.innerText = JSON.stringify(json);
        });
    });
}

function setCanvasSize(c, i) {
    c.width = 512;
    c.height = 512;
    if (i.width > i.height) {
        c.height = c.width * (i.height / i.width);
    } else {
        c.width = c.height * (i.width / i.height);
    }
}

function classify_image(file, webapi) {
    const reader = new FileReader();
    reader.onload = function (e) {
        con.innerText = 'Reader onload start';

        const buffer = new Uint8Array(reader.result);
        const oEXIF = getExif(buffer);
        const canvas = document.getElementById("world");
        const img = new Image();

        img.onload = function () {
            setCanvasSize(canvas, img);
            const ctx = canvas.getContext("2d");
            const orientation = oEXIF.Orientation || 0;
            ctx.putImageData(getCorrectOrientationImage(img, orientation, canvas.width, canvas.height), 0, 0);

            if (webapi) {
                classify_image_web();
            } else {
                classify_image_local(canvas);
            }
        }
        img.src = URL.createObjectURL(new Blob([buffer], {
            type: "image/jpeg"
        }));
        con.innerText = "かんがえちゅう。。。";
    };
    reader.readAsArrayBuffer(file);
}

const pythonBin = getPythonPath();
const tfHome = getTfHome(pythonBin);
const classifyImageScriptPath = getClassifyImagePy(tfHome);
const con = document.getElementById("con");

con.innerHTML = "";

checkWebApi((webapi) => {
    //ドロップされるエリアの取得
    const dropArea = document.getElementById('dropImg');

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.backgroundColor = "#229922";
    }, false);

    dropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropArea.style.backgroundColor = "#88DD88";
    }, false);

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.backgroundColor = "#88DD88";
        const file = e.dataTransfer.files[0];
        if (!file.type.match(/image\/jpeg/)) {
            // 指定したファイル以外の場合、処理を続行しない。
            e.stopPropagation();
            return false;
        }
        classify_image(file, webapi);

        e.stopPropagation();
        con.innerText = "Drop end";
    }, false);

});