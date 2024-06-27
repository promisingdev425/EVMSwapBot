
import express from "express";
import path from 'path';
import cors from "cors";

import fs from 'fs'
import http from 'http'
import https from 'https'

import passport_jwt from './passport-jwt.js';
import passport from 'passport';
import dotenv from 'dotenv'
dotenv.config()

import routeAdmins from './routes/admins.route.js'
import routeUsers from './routes/users.route.js'
// import routeDashboard from './routes/dashboard.route.js'

passport_jwt(passport);

export const start = async (web3, database, bot) => {

  const app = express();

  // app.use(cors(corsOptions));

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization");
    next();
  });

  app.use(express.json()); 
  app.use(express.urlencoded({ extended: true }));
    
  app.use(passport.initialize());
  app.use('/api', routeAdmins(web3, database, bot));
  app.use('/api', routeUsers(web3, database, bot));
  // app.use('/api', routeDashboard(web3, database, bot));
  
  const __dirname = path.dirname(new URL(import.meta.url).pathname);

  app.use(express.static('/home/work/uniswap/swapfork/dist'));
  //app.use(express.static(path.join(__dirname, '/admin/build')));

  app.get('*', function (req, res) {
      res.sendFile(path.join('/home/work/uniswap/swapfork/dist', 'index.html'));
      //res.sendFile(path.join(__dirname, '/admin/build', 'index.html'));
  });
  
  const port = process.env.PORT;
  
  // var options = {
  //     key: fs.readFileSync(__dirname + '/ssl/private.key', 'utf8'),
  //     cert: fs.readFileSync(__dirname + '/ssl/certificate.crt', 'utf8'),
  // };
  
  console.log(`TeleSwap Admin Server started up and running on port ${port} !`);
  
  //https.createServer(options, app).listen(port);
  app.listen(port);
}
