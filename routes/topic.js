import express from 'express';
import mongoose from 'mongoose';
import Topic from '../db/models/topic.js';
import Article from './../db/models/article';
import Acnt from './../db/models/acnt';
import AcntMessage from '../../../front_end/yxchan/pages/hooks/acntMessage.js';
const topic = express.Router()

// 获取所有话题列表
const getAllTopic_ = async (req, res) => {
    const data = await Topic.findOne({}).exec();
    if (data === null) {
        return res.send({
            code: 0,
            msg: '暂无列表信息!',
            data: {},
        });
    } else {
        const list = data.list.map(item => {
            return {
                _id: item._id,
                desc: item.desc,
                key: item.key,
            }
        })
        return res.send({
            code: 1,
            msg: '获取成功!',
            data: {
                list: list,
            },
        });
    }
}

// 获取话题下文章
// topicId
const getTopicArticle_ = async (req, res) => {
    // if (req.query.topicId === undefined) {
    //     return res.send({
    //         code: 0,
    //         msg: '参数错误!',
    //         data: {},
    //     });
    // }
    // const listData = await Topic.findOne({}).exec();
    // const topicSelect = listData.list.filter(item => {
    //     return item._id == req.query.topicId;
    // }) 
    // if (topicSelect[0] !== undefined) {

    //     // const articleIds = topicSelect[0].data.map(id => mongoose.Types.ObjectId(id));
    //     // const articles = await Article.find({ _id: { $in: articleIds } }).exec();

    //     // const authorsList = articles.map(item => {
    //     //     return item.author;
    //     // })
    //     // const authorIds = authorsList[0].data.map(id => mongoose.Types.ObjectId(id));
    //     // const authors = await Acnt.find({_id: { $in: authorIds }}).exec();
        
    //     // const sendList = articles.map((item, index) => {
    //     //     return {
    //     //         _id: item._id,
    //     //         title: item.title,
    //     //     }
    //     // })

    //     return res.send({
    //         code: 1,
    //         msg: '查询成功!',
    //         data: [],
    //     });
    // } else {
        // return res.send({
        //     code: 0,
        //     msg: '话题id错误!',
        //     data: {},
        // });
    // }
    return res.send({
        code: 0,
        msg: '话题id错误!',
        data: {},
    });
}

const routeList = {
    getAllTopic: getAllTopic_,
    getTopicArticle: getTopicArticle_,
}


Object.keys(routeList).forEach(key => {
    topic.get(`/${key}`, routeList[key]);
})

module.exports = topic;
