import express from 'express';
import mongoose from 'mongoose';
import { Article, Acnt, Topic, Record } from './../db/models/index';

const topic = express.Router();

// 获取所有话题列表
const getAllTopics_ = async (req, res) => {
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
                desc: item.desc,
                key: item.key,
                type: item.type,
                total: item.data.length,
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
// key
const getTopicArticles_ = async (req, res) => {
    if (req.query.key === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        });
    }
    const listData = await Topic.findOne({}).exec();
    const topicSelect = listData.list.filter(item => {
        return item.key == req.query.key;
    }) 
    if (topicSelect[0] !== undefined) {

        const articleIds = topicSelect[0].data.map(id => mongoose.Types.ObjectId(id));
        const page = req.query.page === undefined ? 1 : req.query.page;
        const pageSize = req.query.pageSize === undefined ? 12 : req.query.pageSize;
        articleIds.reverse();
        const totalLen = await Article.find({ _id: { $in: articleIds } }).exec();
        const articles = await Article.find({ _id: { $in: articleIds } }).skip(parseInt((page - 1) * pageSize)).limit(parseInt(pageSize)).sort({'createTime': -1}).exec();

        const authorsList = articles.map(item => {
            return item.author;
        })

        const authorIds = authorsList.map(id => mongoose.Types.ObjectId(id));
        const authors = await Acnt.find({_id: { $in: authorIds }}).exec();
        const sendList = articles.map((item, index) => {
            
            let thisAuthor;
            authors.forEach((item_, index_) => {
                if (item.author == item_._id) {
                    thisAuthor = index_;
                }
            })

            return {
                _id: item._id,
                author: {
                    acntNumber: authors[thisAuthor].acntNumber,
                    acntName: authors[thisAuthor].acntName,
                    acntAvatar: authors[thisAuthor].acntAvatar,
                },
                title: item.title,
                type: item.type,
                description: item.description,
                createTime: item.createTime,
                editTime: item.editTime,
                readCount: item.readCount,
                beLike: item.beLike.length,
                collectList: item.collectList.length,
                commentList: item.commentList.length,
            }
        })

        return res.send({
            code: 1,
            msg: '查询成功!',
            data: {
                list: sendList,
                total: totalLen.length,
            },
        });
    } else {
        return res.send({
            code: 0,
            msg: '话题id错误!',
            data: {},
        });
    }
}

// 无人回复文章
const getNoneReplies_ = async (req, res) => {
    if (req.query.key === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        });
    }
    const listData = await Topic.findOne({}).exec();
    const topicSelect = listData.list.filter(item => {
        return item.key == req.query.key;
    }) 
    if (topicSelect[0] !== undefined) {

        const articleIds = topicSelect[0].data.map(id => mongoose.Types.ObjectId(id));
        articleIds.reverse();
        const articles = await Article.find({ _id: { $in: articleIds } }).sort({'createTime': -1}).exec();

        let replies = [];
        articles.forEach(item => {
            if (item.commentList.length === 0) {
                if(replies.length < 5) {
                    replies.push({
                        _id: item._id,
                        title: item.title,
                    })
                } else {
                    return;
                }
            }
        })
        return res.send({
            code: 1,
            msg: '查询成功!',
            data: {
                list: replies,
                total: replies.length
            },
        });
    } else {
        return res.send({
            code: 0,
            msg: '话题key错误!',
            data: {},
        });
    }
}

// 作者其他文章
const otherArticle_ = async (req, res) => {
    if (req.query.id === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        });
    }
    
    const articles_ = await Article.findOne({ _id: mongoose.Types.ObjectId(req.query.id)}).exec();
    if (articles_ === null) {
        return res.send({
            code: 0,
            msg: '404',
            data: {},
        });
    }
    const authorList = await Record.findOne({acntId: articles_.author}).exec();
    if (authorList === null) {
        return res.send({
            code: 0,
            msg: '无此作者!',
            data: {},
        });
    }

    const articleList = authorList.createList.map(id => mongoose.Types.ObjectId(id));
    const articles = await Article.find({ _id: { $in: articleList } }).sort({'createTime': -1}).exec();
    let replies = [];
    articles.forEach(item => {
        if(replies.length < 5 && (item._id.toString() !== req.query.id)) {
            replies.push({
                _id: item._id,
                title: item.title,
            })
        } else {
            return;
        }
    })
    return res.send({
        code: 1,
        msg: '查询成功!',
        data: {
            list: replies,
            total: replies.length
        },
    });
}

const routeList = {
    getAllTopics: getAllTopics_,
    getTopicArticles: getTopicArticles_,
    getNoneReplies: getNoneReplies_,
    otherArticle: otherArticle_,
}


Object.keys(routeList).forEach(key => {
    topic.get(`/${key}`, routeList[key]);
})

module.exports = topic;
