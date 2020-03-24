import express from 'express'
import mongoose from 'mongoose'
import { Article, Acnt, Message } from './../db/models/index'

const acntMessage = express.Router()

const getMessage_ = async (req, res) => {
  if (req.session.acntId) {
    const message = await Message.findOne({acntId: req.session.acntId}).exec();
    if (message === null) {
      return res.send({
        code: 0,
        msg: '用户不存在!',
        data: {},
      })
    }
    let read = message.read;
    let unRead = message.unRead;
    let articleIdList = [];
    read.concat(unRead).forEach(item => {
      articleIdList.push(mongoose.Types.ObjectId(item.fromArticle))
    }) 

    const details = await Article.find({_id: {$in: articleIdList}}).exec();

    let sendRead = read.map(item => {
      let data;
      details.forEach(i => {
        if (i._id.toString() === item.fromArticle) {
          data = {
            articleId: i._id,
            title: i.title,
            messageTime: item.messageTime,
            messageType: item.messageType,
          }
        }
      })
      return data;
    })
    let sendunRead = unRead.map(item => {
      let data;
      details.forEach(i => {
        if (i._id.toString() === item.fromArticle) {
          data = {
            articleId: i._id,
            title: i.title,
            messageTime: item.messageTime,
            messageType: item.messageType,
          }
        }
      })
      return data;
    })

    await Message.updateOne({acntId: req.session.acntId}, {
      $set: {
        unRead: [],
        read: message.read.concat(message.unRead),
      }
    }).exec();

    return res.send({
      code: 1,
      msg: '查询成功!',
      data: {
        read: sendRead.reverse(),
        unRead: sendunRead.reverse(),
      }
    })

  } else {
    return res.send({
      code: 0,
      msg: '未登录',
      data: {},
    })
  }
}

const routeList = {
  getMessage: getMessage_,
}

Object.keys(routeList).forEach(key => {
  acntMessage.post(`/${key}`, routeList[key]);
})

module.exports = acntMessage;
