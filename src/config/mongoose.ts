export {};
// const mongoose = require('mongoose');
const { mongo, env } = require('./vars');
// import mongoose from "mongoose";
import mongoose = require("mongoose");

// set mongoose Promise to Bluebird
// mongoose.Promise = Promise;

// Exit application on error
// mongoose.connection.on('error', (err: any) => {
//   console.error(`MongoDB connection error: ${err}`);
//   process.exit(-1);
// });

// print mongoose logs in dev env
if (env === 'development') {
  mongoose.set('debug', true);
}

/**
 * Connect to mongo db
 *
 * @returns {object} Mongoose connection
 * @public
 */
// exports.connect = () => {
  mongoose.connect(
    mongo.uri
  );
  // return mongoose.connection;
// };
