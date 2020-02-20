/* 
    created by yuxichan on 2020.02.17
*/
import express from 'express';
import mongoose from 'mongoose';
import Acnt from './../db/models/acnt';
const acnt = express.Router();

// 登入
// acntNumber(手机号), acntPassword(密码)
const login_ = async (req, res) => {
    if (req.body.acntNumber === undefined || req.body.acntPassword === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        });
    }
    if(req.body.acntNumber === '') {
        return res.send({
            code: 0,
            msg: '账号不能为空!',
            data: {},
        });
    } else if(req.body.acntPassword === '') {
        return res.send({
            code: 0,
            msg: '密码不能为空!',
            data: {},
        });
    } else {
        const acntInfo = await Acnt.findOne({acntNumber: req.body.acntNumber}).exec();
        if(acntInfo === null) {
            return res.send({
                code: 0,
                msg: '账号不存在!',
                data: {},
            });
        } else if (req.body.acntPassword !== acntInfo.acntPassword) {
            return res.send({
                code: 0,
                msg: '密码错误!',
                data: {},
            });
        }
        const updateLog = await new Promise((resolve, reject)=>{
            Acnt.updateOne({acntNumber: req.body.acntNumber}, {"$push":{"acntLoginLog": Date.parse(new Date())}}, err => {
                if(err) {
                    reject(false);
                } else {
                    resolve(true);
                }
            })
        })
        if (updateLog) {
            req.session.acntId = acntInfo._id;
            const {_id, acntNumber, acntName, acntAvatar, acntSignature, acntGithub, acntBlog, acntAddress, acntPower, acntScore} = acntInfo;
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
            })
        } else {
            return res.send({
                code: 0,
                msg: '登录失败!',
                data: {},
            });
        }
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
    acnt.post(`/${key}`, routeList[key]);
})

module.exports = acnt;
