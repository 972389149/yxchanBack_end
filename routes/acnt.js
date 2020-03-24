/* 
    created by yuxichan on 2020.02.17
*/
import express from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import fs from 'fs'

import { Acnt, Record, Message, Article } from './../db/models/index'

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        Acnt.findOne({_id: id}).then(user => {
            const {acntNumber} = user;
            cb(null, `./public/${acntNumber}/avatar`);
        })
    },
    filename: (req, file, cb) => {
        let names = file.originalname.split('.');
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        Acnt.findOne({_id: id}).then(user => {
            const {acntNumber} = user;
            cb(null, acntNumber + '.' + names[names.length-1]);
        })
    },
})
const fileFilter_ = (req, file, cb) => {
    if (!req.session.acntId) cb(null, false);
    try {
        const names = file.originalname.split('.');
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        const file_type=['jpg','png','jpeg', 'JPG', 'PNG', 'JPEG'];
        if (file_type.indexOf(names[names.length-1]) === -1) {
            cb(null, false);
        } else {
            Acnt.findOne({_id: id}).then(user => {
                new Promise((resolve, reject) => {
                    fs.exists(`public/${user.acntNumber}/avatar`, exists => {
                        if(exists){
                            resolve();
                        }else {
                            fs.mkdir(`public/${user.acntNumber}/avatar`, err => {
                                if (err) {
                                    reject();
                                }
                                resolve();
                            });
                        }
                    })
                })
                .then(val => {
                    Acnt.updateOne({
                        _id: id,
                    }, {
                        $set: {
                            acntAvatar: `${user.acntNumber}/avatar/${user.acntNumber}.${names[names.length-1]}`,
                        }
                    }).then(val => {
                        new Promise((resolve, reject) => {
                            if (user.acntAvatar !== 'default.png') {
                                fs.unlink(`./public/${user.acntAvatar}`, () => {
                                    resolve();
                                })
                            }else {
                                resolve();
                            }
                        })
                        .then(val => {
                            cb(null, true);
                        })
                    })
                })
                .catch(err => {
                    cb(new Error('文件类型错误!'))
                })
            })
        }
    }catch(err) {
        cb(new Error('文件类型错误!'))
    }
}   
const upload = multer({ storage: storage, fileFilter: fileFilter_ }).single('avatar');


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

// 检查是否登录（废弃）
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

// 查询用户状态
const getAcntInfo_ = async (req, res) => {
    if(req.session.acntId) {
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
                msg: '查询成功!',
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
    } else {
        res.send({
            code: 0,
            msg: '未登录',
            data: {}
        })
    }
}

// 注册接口
// acntNumber(手机号), acntName(用户名), acntPassword(密码) 
const register_ = async (req, res) => {
    if (req.body.acntNumber === undefined || req.body.acntPassword === undefined || req.body.acntName === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        });
    }
    if (!(/^1[3456789]\d{9}$/.test(req.body.acntNumber))) {
        return res.send({
            code: 0,
            msg: '手机号格式错误!',
            data: {},
        });
    } else if (req.body.acntName.length < 3 || req.body.acntName.length > 12) {
        return res.send({
            code: 0,
            msg: '用户名长度不符!',
            data: {},
        });
    } else if (req.body.acntPassword.length < 8 || req.body.acntPassword.length > 16) {
        return res.send({
            code: 0,
            msg: '密码长度不符!',
            data: {},
        });
    }
    const hasNumber = await Acnt.findOne({'acntNumber': req.body.acntNumber}).exec();
    if (hasNumber !== null) {
        return res.send({
            code: 0,
            msg: '手机号已被注册!',
            data: {},
        });
    }
    const hasName = await Acnt.findOne({'acntName': req.body.acntName}).exec();
    if (hasName !== null) {
        return res.send({
            code: 0,
            msg: '用户名已被注册!',
            data: {},
        });
    }
    const createFile = await new Promise((resolve, reject) => {
        fs.mkdir(`public/${req.body.acntNumber}`, err => {
            if (err) {
                reject(false);
            }
            resolve(true);
        });
    })
    if (!createFile) {
        return res.send({
            code: 0,
            msg: '创建用户文件失败!',
            data: {},
        });
    }

    const acntSave = new Acnt({
        acntNumber: req.body.acntNumber,
        acntPassword: req.body.acntPassword,
        acntName: req.body.acntName,
        acntAvatar: 'default.png',
        acntSignature: '这个人很懒，什么都没留下~',
        acntGithub: '',
        acntBlog: '',
        acntAddress: '', 
        acntRegisterTime: Date.parse(new Date()),
        acntPower: 0,
        acntScore: 0,
        acntLoginLog: [Date.parse(new Date())],
    })

    acntSave.save((err, doc) => {
        if(err){
            return res.send({
                code: 0,
                msg: err,
                data: {},
            });
        }
        const recordSave = new Record({
            acntId: acntSave._id,
            collectList: [],
            createList: [],
            involeList: [],
        })
        const messageSave = new Message({
            acntId: acntSave._id,
            unRead: [],
            read: [],
        })
        req.session.acntId = acntSave._id;
        const {_id, acntNumber, acntName, acntAvatar, acntSignature, acntGithub, acntBlog, acntAddress, acntPower, acntScore} = acntSave;

        Promise.all([new Promise((resolve, reject) => {
            recordSave.save((recordDoc, recordErr) => {
                if (err) {
                    reject(err);
                }
                resolve(recordDoc);
            })
        }), new Promise((resolve, reject) => {
            messageSave.save((messageDoc, messageErr) => {
                if (err) {
                    reject(err);
                }
                resolve(messageDoc);
            })
        })])
        .then(result => {
            res.send({
                code: 1,
                msg: '注册成功!',
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
        })
        .catch(error => {
            res.send({
                code: 0,
                msg: JSON.stringify(err),
                data: {}
            })
        }) 
    })
}

// 积分榜排名
const getScoreRank_ = async (req, res) => {
    const data = await Acnt.find({}).limit(10).sort({'acntScore': -1}).exec();
    if (data === null) {
        return res.send({
            code: 0,
            msg: '暂无积分排行信息!',
            data: {},
        });
    } else {
        const list = data.map(item => {
            return {
                _id: item._id,
                acntName: item.acntName,
                acntAvatar: item.acntAvatar,
                acntScore: item.acntScore
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

// 第三用户基本信息
const acntMessage_ = async (req, res) => {
    if (req.body.acntName === undefined || req.body.acntName.length < 3 || req.body.acntName.length > 12) {
        return res.send({
            code: 0,
            msg: '用户不存在!',
            data: {
                acnt: {
                    
                },
                record: {
                    createList: [],
                    collectList: [],
                    involeList: [],
                }
            },
        });
    }
    const acntInfo = await Acnt.findOne({'acntName': req.body.acntName}).exec();
    if(acntInfo === null) {
        return res.send({
            code: 0,
            msg: '用户不存在!',
            data: {
                acnt: {
                    
                },
                record: {
                    createList: [],
                    collectList: [],
                    involeList: [],
                }
            },
        });
    }
    const RecordInfo = await Record.findOne({'acntId': acntInfo._id}).exec();
    if(RecordInfo === null) {
        return res.send({
            code: 0,
            msg: '查询出错!',
            data: {
                acnt: {
                    
                },
                record: {
                    createList: [],
                    collectList: [],
                    involeList: [],
                }
            },
        });
    }
    const { acntName, acntAvatar, acntSignature, acntGithub, acntBlog, acntAddress, acntScore, acntRegisterTime} = acntInfo;
    let createList_  = await Article.find({ _id: { $in: RecordInfo.createList }}).sort({'createTime': -1}).exec();
    let collectList_  = await Article.find({ _id: { $in: RecordInfo.collectList }}).sort({'createTime': -1}).exec();
    let involeList_  = await Article.find({ _id: { $in: RecordInfo.involeList }}).sort({'createTime': -1}).exec();

    let articleList = [createList_, collectList_, involeList_];

    let acntIdTotal = [];
    articleList.forEach(item => {
        item.forEach(item_ => acntIdTotal.push(item_.author));
    })

    const acntList = await Acnt.find({ _id: { $in: acntIdTotal } }).exec();
    articleList = articleList.map(item => {
        return item = item.map(item_ => {

            let acntSelect = null;

            acntList.forEach(i => {
                if (i._id == item_.author) {
                    acntSelect = {
                        acntName: i.acntName,
                        acntAvatar: i.acntAvatar,
                    }
                }
            })
            return {
                _id: item_._id,
                author: acntSelect,
                readCount: item_.readCount,
                commentCount: item_.commentList.length,
                title: item_.title,
                type: item_.type,
            }
        })
    })

    return res.send({
        code: 1,
        msg: '查询成功!',
        data: {
            acnt: {
                acntName, acntAvatar, acntSignature, acntGithub, acntBlog, acntAddress, acntScore, acntRegisterTime
            },
            record: {
                createList: articleList[0],
                collectList: articleList[1],
                involeList: articleList[2],
            }
        }
    })
}

// 保存设置
const configSave_ = async (req, res) => {
    const reqList = ['acntName', 'acntAddress', 'acntBlog', 'acntGithub', 'acntSignature'];
    reqList.forEach(item => {
        if (req.body[item] === undefined) {
            res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
    })
    const bodyList = [{
        key: req.body.acntName.length,
        minlen: 3,
        maxlen: 12,
        desc: '用户名',
    }, {
        key: req.body.acntAddress.length,
        minlen: 0,
        maxlen: 30,
        desc: '所在地',
    }, {
        key: req.body.acntBlog.length,
        minlen: 0,
        maxlen: 30,
        desc: '个人站点',
    }, {
        key: req.body.acntGithub.length,
        minlen: 0,
        maxlen: 30,
        desc: 'Github',
    }, {
        key: req.body.acntSignature.length,
        minlen: 0,
        maxlen: 50,
        desc: '个性签名',
    }];
    bodyList.forEach(item => {
        if (item.key < item.minlen || item.key > item.maxlen) {
            return res.send({
                code: 0,
                msg: `${item.desc}超过长度限制!`,
                data: {},
            });
        }
    })
    if (req.session.acntId) {
        const checkName = await Acnt.findOne({acntName: req.body.acntName, _id: {$ne: mongoose.Types.ObjectId(req.session.acntId)}}).exec();
        console.log(checkName)
        if (checkName !== null) {
            return res.send({
                code: 0,
                msg: `用户名已被占用!`,
                data: {},
            })
        }
        const acntUpdate = await Acnt.updateOne({
            _id: mongoose.Types.ObjectId(req.session.acntId),
        }, {
	        $set: {
                acntName: req.body.acntName,
                acntAddress: req.body.acntAddress,
                acntBlog: req.body.acntBlog,
                acntGithub: req.body.acntGithub,
                acntSignature: req.body.acntSignature,
	    	}
        })
        if (acntUpdate.ok === 1) {
            return res.send({
                code: 1,
                msg: `保存成功!`,
                data: {
                    acntName: req.body.acntName,
                    acntAddress: req.body.acntAddress,
                    acntBlog: req.body.acntBlog,
                    acntGithub: req.body.acntGithub,
                    acntSignature: req.body.acntSignature,
                },
            });
        } else {
            return res.send({
                code: 0,
                msg: `保存失败!`,
                data: {},
            });
        }
    }else {
        return res.send({
            code: 0,
            msg: `未登录!`,
            data: {},
        });
    }
}

// 修改密码
const setPassword_ = async (req, res) => {
    if (req.session.acntId) {
        if(req.body.oldPassword === undefined || req.body.newPassword === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        const info = await Acnt.findOne({_id: id}).exec();
        if(!info) {
            return res.send({
                code: 0,
                msg: '用户不存在!',
                data: {},
            })
        }
        if(info.acntPassword !== req.body.oldPassword) {
            return res.send({
                code: 0,
                msg: '验证错误!',
                data: {},
            })
        }
        if(req.body.newPassword.length > 16 || req.body.newPassword.length < 8) {
           return res.send({
            code: 0,
            msg: '密码长度不足!',
            data: {},
           }) 
        }
        Acnt.updateOne({_id: id}, {
            $set: {
                acntPassword: req.body.newPassword,
            }
        })
        .then(val => {
            if (val.ok === 1) {
                res.send({
                    code: 1,
                    msg: '修改成功!',
                    data: {},
                })
            }else {
                res.send({
                    code: 0,
                    msg: '修改密码错误!',
                    data: {},
                })
            }
        })
        .catch(err => {
            res.send({
                code: 0,
                msg: '修改密码错误!',
                data: {},
            })
        })
    }else {
        return res.send({
            code: 0,
            msg: '未登录',
            data: {}
        })
    }
}

// 上传头像
acnt.post('/uploadAvatar', async (req, res) => {
    if (req.session.acntId) {
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        Acnt.findOne({_id: id}).then(user => {
            if(!user) {
                return res.send({
                    code: 0,
                    msg: '账号不存在!',
                    data: {},
                });
            }
            upload(req, res, err => {
                if (err instanceof multer.MulterError || err) {
                    res.send({
                        code: 0,
                        msg: err,
                        data: {},
                    })
                }
                if (req.file !== undefined) {
                    res.send({
                        code: 1,
                        msg: '上传成功!',
                        data: {
                            acntAvatar: `${user.acntNumber}/avatar/${req.file.filename}?${Date.parse(new Date())}`,
                        },
                    })
                } else {
                    res.send({
                        code: 0,
                        msg: '上传失败!',
                        data: {},
                    })
                }
            })  
        })
    } else {
        res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
});

const routeList = {
    login: login_,
    loginout: loginout_,
    check: check_,
    getScoreRank: getScoreRank_,
    register: register_,
    acntMessage: acntMessage_,
    getAcntInfo: getAcntInfo_,
    configSave: configSave_,
    setPassword: setPassword_,
}

Object.keys(routeList).forEach(key => {
    acnt.post(`/${key}`, routeList[key]);
})

module.exports = acnt;
