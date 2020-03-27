import express from 'express'
import { Pref } from './../db/models/index'

const other = express.Router()

const checkNet_ = (req, res) => {
    res.send({
      code: 1,
      msg: '服务器正常!',
      data: {},
    })
}

const pref_ = async (req, res) => {
  if (!(req.query.data === undefined || req.query.data === null)) {
    if (['Index', 'Article', 'Acnt'].indexOf(req.query.page) === -1) {
      return res.send({
        code: 0,
        msg: '此页面无需上报!',
        data: {},
      })
    }
    const list = await Pref.findOne({}).exec();
    if (list === null) {
      return res.send({
        code: 0,
        msg: '上报异常!',
        data: {},
      })
    }
    let queryData;
    try {
      queryData = JSON.parse(req.query.data)
    }catch(err) {
      return res.send({
        code: 0,
        msg: err,
        data: {}
      })
    }
    const check = [queryData.dom, queryData.domready, queryData.firstScreen, queryData.onload, queryData.request];
    if (check.indexOf(undefined) !== -1) {
      return res.send({
        code: 0,
        msg: '上报信息错误!',
        data: {}
      })
    }

    if (list[req.query.page].length > 1000) {
      list[req.query.page] = list[req.query.page].slice(list[req.query.page].length - 1000 , list[req.query.page].length);
    }
    list[req.query.page].push(queryData);
    const update = await Pref.updateOne({}, {
      $set: {
        Index: list.Index,
        Article: list.Article,
        Acnt: list.Acnt,
      }
    })
    if (update.ok !== 1) {
        return res.send({
            code: 0,
            msg: '上报失败!',
            data: {}
        })
    }
    return res.send({
      code: 1,
      msg: '上报成功!',
      data: {},
    })
  } else {
    return res.send({
      code: 0,
      msg: '上报信息错误!',
      data: {},
    })
  }
}

const getPref_ = async (req, res) => {
  const list = await Pref.findOne({}).exec();
  if (list === null) {
    return res.send({
      code: 0,
      msg: '性能数据异常!',
      data: {},
    })
  }
  return res.send({
    code: 1,
    msg: '查询成功！',
    data: list,
  })

}

const routeList = {
    checkNet: checkNet_,
    pref: pref_,
    getPref: getPref_,
}

Object.keys(routeList).forEach(key => {
  other.get(`/${key}`, routeList[key]);
})

module.exports = other;
