const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const articleSchema = new Schema({
	author: String,
    type: Number,
    title: String,
    description: String,
    content: String,
    createTime: String,
    editTimes: String,
    editTime: String,
    readCount: Number,
    beLike: Array,
    collectList: Array,
    commentList: Array,
});
module.exports = articleSchema;
