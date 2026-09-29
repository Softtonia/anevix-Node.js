require('dotenv').config();
const mongoose = require('mongoose');
const HsnCode = require('./src/models/tax/HsnCode');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Count:', await HsnCode.countDocuments());
  console.log('Text Search for 998595:', await HsnCode.find({ $text: { $search: "998595" } }).lean());
  console.log('Regex Search for 998595:', await HsnCode.find({ hsnCode: { $regex: "^998595" } }).lean());
  console.log('Regex Search for 998:', await HsnCode.find({ hsnCode: { $regex: "^998" } }).lean());
  console.log('Find By Code 998595:', await HsnCode.findOne({ hsnCode: "998595" }).lean());
  process.exit(0);
}
run();
