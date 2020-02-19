const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const acntSchema = new Schema({
	acntNumber: String,
    acntPassword: String,
    acntName: String,
    acntAvatar: String,
    acntSignature: String,
    acntGithub: String,
    acntBlog: String,
    acntAddress: String, 
    acntRegisterTime: String,
    acntPower: Number,
    acntScore: Number,
    acntLoginLog: Array,
});
module.exports = acntSchema;
