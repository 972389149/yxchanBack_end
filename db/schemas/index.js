const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 账号相关
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

// 账号记录
const recordSchema = new Schema({
    acntId: String,
    collectList: Array,
    createList: Array,
    involeList: Array,
});

// 消息
const messageSchema = new Schema({
    acntId: String,
    unRead: Array,
    read: Array,
});

// 文章
const articleSchema = new Schema({
	author: String,
    type: Number,
    title: String,
    description: String,
    content: String,
    createTime: String,
    editTime: String,
    readCount: Number,
    beLike: Array,
    collectList: Array,
    commentList: Array,
});

// 话题
const topicSchema = new Schema({
	list: Array,
});

// 性能数据
const prefSchema = new Schema({
    Index: Array,
    Article: Array,
    Acnt: Array,
});

module.exports = {
    acntSchema,
    recordSchema,
    messageSchema,
    articleSchema,
    topicSchema,
    prefSchema,
};
