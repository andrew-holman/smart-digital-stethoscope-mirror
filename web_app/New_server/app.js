// app.js
const tf = require('@tensorflow/tfjs');
const {spawn} = require('child_process');
const cors = require('cors');
const express = require('express');

const http = require('http');


let app = express()
app.use(cors())

// // Create an instance of the http server to handle HTTP requests
// let server = http.createServer( async (req, res) => {
//     // Set a response type of plain text for the response
//     res.writeHead(200, {'Content-Type': 'text/plain'});
    
//     pathToFile = req.url.toString();
//     pathToFile = pathToFile.substring(4, pathToFile.length-3);
//     console.log(pathToFile);
//     var dataToSend;
//     // spawn new child process to call the python script
//     const python = spawn('python', ['load_audio.py', pathToFile]);

//     let sample;
//     // collect data from script
//     python.stdout.on('data', function (data) {
//         console.log('Pipe data from python script ...');
//         dataToSend = data.toString();
//     });
//     // in close event we are sure that stream from child process is closed
//     python.on('close', async (code) => {
//         console.log(`child process close all stdio with code ${code}`);
//         // send data to browser
//         // res.send(dataToSend)
//         // const data = require('./data.json');
//         // // let array = data.splice(0);
//         // let tensor = tf.tensor4d(data);
//         // // model.compile();
//         // let prediction = model.predict(tensor);
//         // console.log(prediction.toString());
//         // console.log(prediction.val.as1D())
//         res.end(dataToSend);
//     });
// });

// Run with dae01177-c45a-4675-9b1b-045ba923bdac

app.get('*', async (req, res) => {
    // Set a response type of plain text for the response
    res.writeHead(200, {'Content-Type': 'text/plain'});
    
    pathToFile = req.url.toString();
    pathToFile = pathToFile.substring(4, pathToFile.length-3);
    console.log(pathToFile);
    var dataToSend;
    // spawn new child process to call the python script
    const python = spawn('python', ['load_audio.py', pathToFile]);

    let sample;
    // collect data from script
    python.stdout.on('data', function (data) {
        console.log('Pipe data from python script ...');
        dataToSend = data.toString();
    });
    // in close event we are sure that stream from child process is closed
    python.on('close', async (code) => {
        console.log(`child process close all stdio with code ${code}`);
        // send data to browser
        // res.send(dataToSend)
        // const data = require('./data.json');
        // // let array = data.splice(0);
        // let tensor = tf.tensor4d(data);
        // // model.compile();
        // let prediction = model.predict(tensor);
        // console.log(prediction.toString());
        // console.log(prediction.val.as1D())
        res.end(dataToSend);
    });
});
// app.use('/', server);
// Start the server on port 3000
// app.listen(3000, '127.0.0.1');
app.listen(3000, () => console.log('Server listening on port 3000!'));
// console.log('Node server running on port 3000');