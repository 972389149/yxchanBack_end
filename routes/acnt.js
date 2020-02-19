/* 
    created by yuxichan on 2020.02.17
*/
import express from 'express';
import mongoose from 'mongoose';
import Acnt from './../db/models/acnt';
const acnt = express.Router();

// 登入
// acntNumber(手机号), acntPassword(密码)
const login_ = (req, res) => {
    if(req.query.acntNumber === '') {
        return res.send({
            code: 0,
            msg: '账号不能为空!',
            data: {},
        });
    } else if(req.query.acntPassword === '') {
        return res.send({
            code: 0,
            msg: '密码不能为空!',
            data: {},
        });
    } else {
        Acnt.findOne({acntNumber: req.query.acntNumber}).then(user => {
            if(!user) {
                return res.send({
                    code: 0,
                    msg: '账号不存在!',
                    data: {},
                });
            }
            if(req.query.acntPassword !== user.acntPassword) {
                return res.send({
                    code: 0,
                    msg: '密码错误!',
                    data: {},
                });
            }
            req.session.acntId = user._id;
            const {_id, acntNumber, acntName, acntAvatar, acntSignature, acntGithub, acntBlog, acntAddress, acntPower, acntScore} = user;
            return res.send({
                code: 1,
                msg: '登录成功!',
                data: {
                    _id, 
                    acntNumber, 
                    acntName,
                    acntAvatar,
                    acntSignature,
                    acntGithub,
                    acntBlog,
                    acntAddress,
                    acntPower,
                    acntScore,
                },
            });
        })
    }
}

// 登出
const loginout_ = (req, res) => {
    req.session.destroy(err => {
        if (err === null) {
            res.clearCookie('YXC');
            return res.send({
                code: 1,
                msg: '退出登录成功',
                data: {},
            });
        }
        return res.send({
            code: 0,
            msg: err,
            data: {},
        });
    });
}

// 检查是否登录
const check_ = (req, res) => {
    if(req.session.acntId){
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        Acnt.findOne({_id: id}).then(user => {
            if(!user) {
                return res.send({
                    code: 0,
                    msg: '账号不存在!',
                    data: {},
                });
            }
            req.session.acntId = user._id;
            const {_id, acntNumber, acntName, acntAvatar, acntSignature, acntGithub, acntBlog, acntAddress, acntPower, acntScore} = user;
            return res.send({
                code: 1,
                msg: '已登录!',
                data: {
                    _id, 
                    acntNumber, 
                    acntName,
                    acntAvatar,
                    acntSignature,
                    acntGithub,
                    acntBlog,
                    acntAddress,
                    acntPower,
                    acntScore,
                },
            });
        })
    } else{
        // const auth_token = req.signedCookies['YXC'];
        return res.send({
            code: 0,
            msg: '未登录',
            data: {},
        });
    }
}

const routeList = {
    login: login_,
    loginout: loginout_,
    check: check_,
}

Object.keys(routeList).forEach(key => {
    acnt.get(`/${key}`, routeList[key]);
})

module.exports = acnt;
