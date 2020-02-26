import express from 'express'

const other = express.Router()

const checkNet_ = (req, res) => {
    res.send({
      code: 1,
      msg: '服务器正常!',
      data: {},
    })
}

const routeList = {
    checkNet: checkNet_,
}

Object.keys(routeList).forEach(key => {
  other.get(`/${key}`, routeList[key]);
})

module.exports = other;
