import express from 'express';
import path from "path";
import { json } from 'stream/consumers';

export const app= express();

const port:number = 1956;

app.listen(port, () => {
   console.log(`http://localhost:${port}`)
 })

app.get('/', function(req, response) {
   response.sendFile(path.join(__dirname,"..","..","html","main.html"));
});
