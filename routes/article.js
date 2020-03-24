import express from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import fs from 'fs'

import { Article, Acnt, Topic, Record, Message } from './../db/models/index'

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const id = mongoose.Types.ObjectId(req.session.acntId); 
        Acnt.findOne({_id: id}).then(user => {
            const {acntNumber} = user;
            cb(null, `./public/${acntNumber}/upload`)
        })
    },
    filename: (req, file, cb) => {
        const names = file.originalname.split('.');
        cb(null, Date.parse(new Date()) + '.' + names[names.length-1].toLowerCase());
    },
})
const fileFilter_ = (req, file, cb) => {
    try {
        const names = file.originalname.split('.');
        const file_type=['jpg','png','jpeg', 'JPG', 'PNG', 'JPEG'];
        if (file_type.indexOf(names[names.length-1]) === -1) {
            cb(null, false);
        } else {
            const id = mongoose.Types.ObjectId(req.session.acntId); 
            Acnt.findOne({_id: id}).then(user => {
                fs.exists(`public/${user.acntNumber}/upload`, exists => {
                    if(exists){
                        cb(null, true);
                    }else {
                        fs.mkdir(`public/${user.acntNumber}/upload`, err => {
                            if (err) {
                                return cb(null, false);
                            }
                            cb(null, true);
                        });
                    }
                })
            })
        }
    }catch(err) {
        cb(new Error('文件类型错误!'))
    }
}   
const upload = multer({ storage: storage, fileFilter: fileFilter_ }).single('articles');

const article = express.Router()

// 文章图片上传
const uploadImg_ = async (req, res) => {
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
                        msg: '上传失败!',
                        data: {},
                    })
                }else {
                    const filePath = req.file.path.replace(/\\/g,'/').split('/');
                    res.send({
                        code: 1,
                        msg: '上传成功!',
                        data: {
                            originalname: req.file.originalname,
                            path: filePath[1] + '/' + filePath[2] + '/' + filePath[3],
                        },
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
} 

// 发布文章
const publish_ = async (req, res) => {
    if (!req.session.acntId) {
        return res.send({
            code: 0,
            msg: '未登录',
            data: {}
        })
    }
    const list = [req.body.key, req.body.title, req.body.description, req.body.content];
    if (list.indexOf(undefined) !== -1) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        })
    }
    if (['essence', 'share', 'qanda', 'recruit', 'test'].indexOf(req.body.key) === -1) {
        return res.send({
            code: 0,
            msg: '文章类型错误',
            data: {},
        })
    }
    const topicList = await Topic.findOne({}).exec();
    const select = topicList.list.filter(item => {
        return item.key === req.body.key;
    })
    const keyType = {
        'essence': 1,
        'share': 2,
        'qanda': 3,
        'recruit': 4,
        'test': 5,
    }
    const user = await Acnt.findOne({'_id': mongoose.Types.ObjectId(req.session.acntId)}).exec();
    if (user === null) {
        return res.send({
            code: 0,
            msg: '用户不存在!',
            data: {},
        })
    }
    const fileCreate = await new Promise((resolve, reject) => {
        fs.exists(`public/${user.acntNumber}/articles`, exists => {
            if(exists){
                resolve(true);
            }else {
                fs.mkdir(`public/${user.acntNumber}/articles`, err => {
                    if (err) {
                        resolve(false);
                    }
                    resolve(true);
                });
            }
        })
    })
    if (!fileCreate) {
        return res.send({
            code: 0,
            msg: '文件夹创建失败!',
            data: {},
        })
    }
    let mdFileName = `${user.acntNumber}/articles/${Date.parse(new Date())}.md`
    const mdCreate = await new Promise((resolve, reject) => {
        fs.writeFile(`public/${mdFileName}`, req.body.content,  err => {
            if (err) {
                resolve(false);
            }
            resolve(true);
        });
    })
    if (!mdCreate) {
        return res.send({
            code: 0,
            msg: '.md文件创建失败!',
            data: {}
        })
    }
    const saveArticle = new Article({
        author: req.session.acntId,
        type: keyType[select[0].key],
        title: req.body.title,
        description: req.body.description,
        content: mdFileName,
        createTime: String(Date.parse(new Date())),
        editTime: '',
        readCount: 0,
        beLike: [],
        collectList: [],
        commentList: [],
    });

    const article_ =  await saveArticle.save();
    if (!article_) {
        return res.send({
            code: 0,
            msg: article_,
            data: {},
        })
    }

    const update = topicList.list.map(item => {
        if(item.key === 'all' || item.key === req.body.key) {
            let arr = item.data;
            arr.push(mongoose.Types.ObjectId(article_._id).toString())
            return {
                key: item.key,
                desc: item.desc,
                type: item.type,
                data: arr,
            }
        }else {
            return {
                key: item.key,
                desc: item.desc,
                type: item.type,
                data: item.data,
            }
        }
    })

    const topicUpdate = await Topic.updateOne({}, {
        $set: {
            list: update,
        }
    })
    if (topicUpdate.ok !== 1) {
        return res.send({
            code: 0,
            msg: '发布失败!',
            data: {}
        })
    }

    const recordUpdate = await Record.updateOne({acntId: req.session.acntId}, {
        $push: {
            createList: mongoose.Types.ObjectId(saveArticle._id).toString(),
        },
    })
    if (recordUpdate.ok !== 1) {
        return res.send({
            code: 0,
            msg: '发布失败!',
            data: {}
        })
    }

    const userUpdate = await Acnt.updateOne({'_id': mongoose.Types.ObjectId(req.session.acntId)}, {
        $set: {
            acntScore: user.acntScore + 50,
        },
    })
    if (userUpdate.ok !== 1) {
        return res.send({
            code: 0,
            msg: '积分添加失败!',
            data: {}
        })
    }

    return res.send({
        code: 1,
        msg: '文章发布成功!',
        data: {
            articleId: article_._id,
        }
    })
}

// 编辑文章
const edit_ = async (req, res) => {
    if (req.session.acntId) {
        const list = [req.body.id, req.body.description, req.body.content];
        if (list.indexOf(undefined) !== -1) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }

        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        const pathname = detail.content;
        // 查找md文件是否存在
        const findFile = await new Promise((resolve, reject) => {
            fs.exists(`public/${pathname}`, exists => {
                if(exists){
                    resolve(true);
                }
                resolve(false);
            })
        })
        if (!findFile) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        // 写入新的内容
        const editFile = await new Promise((resolve, reject) => {
            fs.writeFile(`public/${pathname}`, req.body.content,  err => {
                if (err) {
                    resolve(false);
                }
                resolve(true);
             });
        })
        if (!editFile) {
            return res.send({
                code: 0,
                msg: '编辑失败!',
                data: {},
            })
        }

        await Article.updateOne({_id: mongoose.Types.ObjectId(req.body.id)}, {
            $set: {
                description: req.body.description,
                editTime: Date.parse(new Date()),
            },
        }).exec();

        const list_ = detail.collectList.map(id => mongoose.Types.ObjectId(id));
        await Message.updateMany({acntId: {$in: list_}}, {
            $push: {
                unRead: {
                    fromArticle: req.body.id,
                    messageTime: Date.parse(new Date()),
                    messageType: 6,
                }
            },
        }).exec();

        return res.send({
            code: 1,
            msg: '编辑成功!',
            data: {
                id: req.body.id,
            }
        })


    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 点赞文章
const articleLike_ = async (req, res) => {
    if (req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        
        if (req.session.acntId === detail.author) {
            return res.send({
                code: 0,
                msg: '不能点赞自己的文章!',
                data: {},
            })
        }

        if (detail.beLike.indexOf(req.session.acntId) !== -1) {
            return res.send({
                code: 0,
                msg: '请勿重复点赞!',
                data: {},
            })
        }

        // 更新文章
        const like = await Article.updateOne({_id: mongoose.Types.ObjectId(req.body.id)}, {
            $push: {
                beLike: req.session.acntId,
            },
        }).exec();
        if (like.ok !== 1) {
            return res.send({
                code: 0,
                msg: '点赞失败!',
                data: {},
            })
        }

        // 更新记录
        const record = await Record.updateOne({acntId: req.session.acntId}, {
            $push: {
                involeList: req.body.id,
            },
        }).exec();
        if (record.ok !== 1) {
            return res.send({
                code: 0,
                msg: '点赞失败!',
                data: {},
            })
        }

        // 消息推送
        const message = await Message.updateOne({acntId: detail.author}, {
            $push: {
                unRead: {
                    fromArticle: req.body.id,
                    messageTime: Date.parse(new Date()),
                    messageType: 2,
                }
            }
        }).exec();
        if (message.ok !== 1) {
            return res.send({
                code: 1,
                msg: '信息推送失败!',
                data: {},
            })
        }

        return res.send({
            code: 1,
            msg: '点赞成功!',
            data: {},
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 取消文章点赞
const articleLikeC_ = async (req, res) => {
    if (req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }

        if (detail.beLike.indexOf(req.session.acntId) === -1) {
            return res.send({
                code: 0,
                msg: '当前并未点赞!',
                data: {},
            })
        } else {
            detail.beLike.splice(detail.beLike.indexOf(req.session.acntId), 1);
        }

        // 更新文章
        const likec = await Article.updateOne({_id: mongoose.Types.ObjectId(req.body.id)}, {
            $set: {
                beLike: detail.beLike,
            },
        }).exec();
        if (likec.ok !== 1) {
            return res.send({
                code: 0,
                msg: '取消点赞失败!',
                data: {},
            })
        }

        const acntRecord = await Record.findOne({acntId: req.session.acntId}).exec();
        if (acntRecord.involeList.indexOf(req.body.id) === -1) {
            return res.send({
                code: 0,
                msg: '当前并未点赞!',
                data: {},
            })
        } else {
            acntRecord.involeList.splice(acntRecord.involeList.indexOf(req.session.acntId), 1);
        }


        // 更新记录
        const record = await Record.updateOne({acntId: req.session.acntId}, {
            $set: {
                involeList: acntRecord.involeList,
            },
        }).exec();
        if (record.ok !== 1) {
            return res.send({
                code: 0,
                msg: '取消失败!',
                data: {},
            })
        }

        return res.send({
            code: 1,
            msg: '取消成功!',
            data: {},
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 删除文章
const articleDel_ = async (req, res) => {
    if (req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        if (req.session.acntId !== detail.author) {
            return res.send({
                code: 0,
                msg: '您没权限删除该篇文章!',
                data: {},
            })
        }
        const delMd = await new Promise((resolve, reject) => {
            fs.unlink(`public/${detail.content}`, err => {
                resolve(false);
            })
            resolve(true);
        })
        if (!delMd) {
            return res.send({
                code: 0,
                msg: '删除md文件失败!',
                data: {},
            })
        }

        const articledel = await Article.remove({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (articledel.ok !== 1) {
            return res.send({
                code: 0,
                msg: '删除文章失败!',
                data: {},
            })
        }
        return res.send({
            code: 1,
            msg: '删除文章成功!',
            data: {},
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 收藏文章
const collect_ = async (req, res) => {
    if (req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        
        if (req.session.acntId === detail.author) {
            return res.send({
                code: 0,
                msg: '不能收藏自己的文章!',
                data: {},
            })
        }
        if (detail.collectList.indexOf(req.session.acntId) !== -1) {
            return res.send({
                code: 0,
                msg: '请勿重复收藏!',
                data: {},
            })
        }

        // 更新文章
        const collect = await Article.updateOne({_id: mongoose.Types.ObjectId(req.body.id)}, {
            $push: {
                collectList: req.session.acntId,
            },
        }).exec();
        if (collect.ok !== 1) {
            return res.send({
                code: 0,
                msg: '收藏失败!',
                data: {},
            })
        }

        // 更新记录
        const record = await Record.updateOne({acntId: req.session.acntId}, {
            $push: {
                collectList: req.body.id,
            },
        }).exec();
        if (record.ok !== 1) {
            return res.send({
                code: 0,
                msg: '收藏失败!',
                data: {},
            })
        }

        // 消息推送
        const message = await Message.updateOne({acntId: detail.author}, {
            $push: {
                unRead: {
                    fromArticle: req.body.id,
                    messageTime: Date.parse(new Date()),
                    messageType: 3,
                }
            }
        }).exec();
        if (message.ok !== 1) {
            return res.send({
                code: 1,
                msg: '信息推送失败!',
                data: {},
            })
        }

        return res.send({
            code: 1,
            msg: '收藏成功!',
            data: {},
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 取消文章收藏
const collectC_ = async (req, res) => {
    if (req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        if (detail.collectList.indexOf(req.session.acntId) === -1) {
            return res.send({
                code: 0,
                msg: '当前并未收藏!',
                data: {},
            })
        } else {
            detail.collectList.splice(detail.collectList.indexOf(req.session.acntId), 1);
        }

        // 更新文章
        const likec = await Article.updateOne({_id: mongoose.Types.ObjectId(req.body.id)}, {
            $set: {
                collectList: detail.collectList,
            },
        }).exec();
        if (likec.ok !== 1) {
            return res.send({
                code: 0,
                msg: '取消收藏失败!',
                data: {},
            })
        }

        const acntRecord = await Record.findOne({acntId: req.session.acntId}).exec();
        if (acntRecord.collectList.indexOf(req.body.id) === -1) {
            return res.send({
                code: 0,
                msg: '当前并未收藏!',
                data: {},
            })
        } else {
            acntRecord.collectList.splice(acntRecord.collectList.indexOf(req.session.acntId), 1);
        }

        // 更新记录
        const record = await Record.updateOne({acntId: req.session.acntId}, {
            $set: {
                collectList: acntRecord.collectList,
            },
        }).exec();
        if (record.ok !== 1) {
            return res.send({
                code: 0,
                msg: '取消失败!',
                data: {},
            })
        }
        return res.send({
            code: 1,
            msg: '取消成功!',
            data: {},
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 发布评论
const comment_ = async (req, res) => {
    if (req.session.acntId) {
        const check = [req.body.id, req.body.comment];
        if (check.indexOf(undefined) !== -1 || req.body.comment === '') {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        const commentId = mongoose.Types.ObjectId().toString();
        const time = Date.parse(new Date());
        const pushComment = await Article.updateOne({_id: mongoose.Types.ObjectId(req.body.id)}, {
            $push: {
                commentList: {
                    _id: commentId,
                    articleId: req.body.id,
                    author: req.session.acntId, 
                    comment: req.body.comment,
                    commentTime: time,
                    beLike: [],
                },
            },
        }).exec();
        if (pushComment.ok !== 1) {
            return res.send({
                code: 0,
                msg: '评论失败!',
                data: {},
            })
        }

        // 向文章收藏者推送消息
        await Message.updateMany({acntId: {$in: detail.collectList}}, {
            $push: {
                unRead: {
                    fromArticle: req.body.id,
                    messageTime: time,
                    messageType: 5,
                }
            },
        }).exec();
        // 向文章作者推送消息
        if (req.session.acntId !== detail.author) {
            await Message.updateOne({acntId: detail.author}, {
                $push: {
                    unRead: {
                        fromArticle: req.body.id,
                        messageTime: time,
                        messageType: 1,
                    },
                },
            }).exec();
        }
        const acntInfo = await Acnt.findOne({_id: mongoose.Types.ObjectId(req.session.acntId)}).exec();
        if (acntInfo === null) {
            return res.send({
                code: 0,
                msg: '用户不存在!',
                data: {},
            })
        }
        
        let commentAuthorId = [];
        let arr = detail.commentList;
        arr.push({
            _id: commentId,
            articleId: req.body.id,
            author: req.session.acntId, 
            comment: req.body.comment,
            commentTime: time,
            beLike: [],
        })
        arr.forEach(item => {
            if (commentAuthorId.indexOf(item.author) === -1) {
                commentAuthorId.push(mongoose.Types.ObjectId(item.author));
            }
        })
        const acntsInfo = await Acnt.find({_id: {$in: commentAuthorId}}).exec();
        const list_ = arr.map(item => {
            let authorInfo;
            acntsInfo.forEach(item_ => {
                if (item_._id.toString() === item.author) {
                    authorInfo = {
                        _id: item_._id,
                        acntName: item_.acntName,
                        acntAvatar: item_.acntAvatar,
                    }
                }
            })
            return {
                _id: item._id, 
                author: authorInfo, 
                comment: item.comment,
                commentTime: item.commentTime,
                beLike: item.beLike,
            }
        })

        return res.send({
            code: 1,
            msg: '发布成功!',
            data: {
                list: list_,
            },
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 点赞评论
const commentLike_ = async (req, res) => {
    if (req.session.acntId) {
        const check = [req.body.articleId, req.body.commentId];
        if (check.indexOf(undefined) !== -1) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.articleId)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        let index_ = -1;
        detail.commentList.forEach((item, index) => {
            if (item._id.toString() === req.body.commentId) {
                index_ = index;
            }
        })
        if (index_ === -1) {
            return res.send({
                code: 0,
                msg: '不存在此条评论!',
                data: {},
            })
        }
        if (detail.commentList[index_].beLike.indexOf(req.session.acntId) !== -1) {
            return res.send({
                code: 0,
                msg: '请勿重复点赞!',
                data: {},
            })
        }

        const list_ = detail.commentList.map(item => {
            if (item._id.toString() === req.body.commentId) {
                item.beLike.push(req.session.acntId);
                return item;
            } else {
                return item;
            }
        })

        const likeComment = await Article.updateOne({_id:  mongoose.Types.ObjectId(req.body.articleId)}, {
            $set: {
                commentList: list_,
            }
        }).exec();

        if (likeComment.ok !== 1) {
            return res.send({
                code: 0,
                msg: '评论点赞失败!',
                data: {},
            })
        }

        await Message.updateOne({acntId: detail.commentList[index_].author}, {
            $push: {
                unRead: {
                    fromArticle: req.body.articleId,
                    messageTime: Date.parse(new Date()),
                    messageType: 4,
                },
            },
        }).exec()

        let commentAuthorId = [];
        let arr = list_;
        arr.forEach(item => {
            if (commentAuthorId.indexOf(item.author) === -1) {
                commentAuthorId.push(mongoose.Types.ObjectId(item.author));
            }
        })
        const acntsInfo = await Acnt.find({_id: {$in: commentAuthorId}}).exec();
        const lists_ = arr.map(item => {
            let authorInfo;
            acntsInfo.forEach(item_ => {
                if (item_._id.toString() === item.author) {
                    authorInfo = {
                        _id: item_._id,
                        acntName: item_.acntName,
                        acntAvatar: item_.acntAvatar,
                    }
                }
            })
            return {
                _id: item._id, 
                author: authorInfo, 
                comment: item.comment,
                commentTime: item.commentTime,
                beLike: item.beLike,
            }
        })
        return res.send({
            code: 1,
            msg: '点赞成功!',
            data: {
                list: lists_,
            },
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 取消评论点赞
const commentLikeC_ = async (req, res) => {
    if (req.session.acntId) {
        const check = [req.body.articleId, req.body.commentId];
        if (check.indexOf(undefined) !== -1) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.articleId)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        let index_ = -1;
        detail.commentList.forEach((item, index) => {
            if (item._id.toString() === req.body.commentId) {
                index_ = index;
            }
        })
        if (index_ === -1) {
            return res.send({
                code: 0,
                msg: '不存在此条评论!',
                data: {},
            })
        }
        if (detail.commentList[index_].beLike.indexOf(req.session.acntId) === -1) {
            return res.send({
                code: 0,
                msg: '当前评论并未点赞!',
                data: {},
            })
        }

        const list_ = detail.commentList.map((item) => {
            if (item._id.toString() === req.body.commentId) {
                item.beLike.splice(item.beLike.indexOf(req.session.acntId), 1);
                return item;
            } else {
                return item;
            }
        })

        const likeComment = await Article.updateOne({_id:  mongoose.Types.ObjectId(req.body.articleId)}, {
            $set: {
                commentList: list_,
            }
        }).exec();

        if (likeComment.ok !== 1) {
            return res.send({
                code: 0,
                msg: '取消评论点赞失败!',
                data: {},
            })
        }
        let commentAuthorId = [];
        let arr = list_;
        arr.forEach(item => {
            if (commentAuthorId.indexOf(item.author) === -1) {
                commentAuthorId.push(mongoose.Types.ObjectId(item.author));
            }
        })
        const acntsInfo = await Acnt.find({_id: {$in: commentAuthorId}}).exec();
        const lists_ = arr.map(item => {
            let authorInfo;
            acntsInfo.forEach(item_ => {
                if (item_._id.toString() === item.author) {
                    authorInfo = {
                        _id: item_._id,
                        acntName: item_.acntName,
                        acntAvatar: item_.acntAvatar,
                    }
                }
            })
            return {
                _id: item._id, 
                author: authorInfo, 
                comment: item.comment,
                commentTime: item.commentTime,
                beLike: item.beLike,
            }
        })
        return res.send({
            code: 1,
            msg: '取消评论点赞成功!',
            data: {
                list: lists_,
            },
        })


    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 删除评论
const commentDel_ = async (req, res) => {
    if (req.session.acntId) {
        const check = [req.body.articleId, req.body.commentId];
        if (check.indexOf(undefined) !== -1) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.articleId)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        let index_ = -1;
        detail.commentList.forEach((item, index) => {
            if (item._id.toString() === req.body.commentId) {
                index_ = index;
            }
        })
        if (index_ === -1) {
            return res.send({
                code: 0,
                msg: '不存在此条评论!',
                data: {},
            })
        }
        const delComment = await Article.updateOne({_id:  mongoose.Types.ObjectId(req.body.articleId)}, {
            $set: {
                commentList: [...detail.commentList.slice(0, index_), ...detail.commentList.slice(index_ + 1, detail.commentList.length)],
            },
        }).exec();

        if (delComment.ok !== 1) {
            return res.send({
                code: 0,
                msg: '删除评论失败!',
                data: {},
            })
        }
        
        let commentAuthorId = [];
        let arr = [...detail.commentList.slice(0, index_), ...detail.commentList.slice(index_ + 1, detail.commentList.length)];
        arr.forEach(item => {
            if (commentAuthorId.indexOf(item.author) === -1) {
                commentAuthorId.push(mongoose.Types.ObjectId(item.author));
            }
        })
        const acntsInfo = await Acnt.find({_id: {$in: commentAuthorId}}).exec();
        const list_ = arr.map(item => {
            let authorInfo;
            acntsInfo.forEach(item_ => {
                if (item_._id.toString() === item.author) {
                    authorInfo = {
                        _id: item_._id,
                        acntName: item_.acntName,
                        acntAvatar: item_.acntAvatar,
                    }
                }
            })
            return {
                _id: item._id, 
                author: authorInfo, 
                comment: item.comment,
                commentTime: item.commentTime,
                beLike: item.beLike,
            }
        })

        return res.send({
            code: 1,
            msg: '删除评论成功!',
            data: {
                list: list_,
            },
        })

    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 获取文章内容
const articleDetail_ = async (req, res) => {
    if(req.body.id === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {},
        })
    }
    const detail =  await Article.findOne({'_id': mongoose.Types.ObjectId(req.body.id)}).exec();
    if (detail === null) {
        return res.send({
            code: 0,
            msg: '404',
            data: {},
        })
    }
    const authorInfo = await Acnt.findOne({'_id': mongoose.Types.ObjectId(detail.author)}).exec();
    if (authorInfo === null) {
        return res.send({
            code: 0,
            msg: '作者404',
            data: {},
        })
    }

    let commentAuthorId = [];
    detail.commentList.forEach(item => {
        if (commentAuthorId.indexOf(item.author) === -1) {
            commentAuthorId.push(mongoose.Types.ObjectId(item.author));
        }
    })
    const acntsInfo = await Acnt.find({_id: {$in: commentAuthorId}}).exec();
    const list_ = detail.commentList.map(item => {
        let authorInfo;
        acntsInfo.forEach(item_ => {
            if (item_._id.toString() === item.author) {
                authorInfo = {
                    _id: item_._id,
                    acntName: item_.acntName,
                    acntAvatar: item_.acntAvatar,
                }
            }
        })
        return {
            _id: item._id, 
            author: authorInfo, 
            comment: item.comment,
            commentTime: item.commentTime,
            beLike: item.beLike,
        }
    })

    Article.updateOne({'_id': mongoose.Types.ObjectId(req.body.id)}, {
        $set: {
            readCount: detail.readCount + 1,
        },
    }, err => {
        res.send({
            code: 1,
            msg: '获取成功!',
            data: {
                _id: detail._id,
                beLike: detail.beLike.length,
                collectList: detail.collectList.length,
                commentList: list_,
                type: detail.type,
                title: detail.title,
                description: detail.description,
                content: detail.content,
                createTime: detail.createTime,
                editTime: detail.editTime,
                author: {
                    acntName: authorInfo.acntName,
                    acntAvatar: authorInfo.acntAvatar, 
                    acntScore: authorInfo.acntScore,
                    acntSignature: authorInfo.acntSignature,
                },
                readCount: detail.readCount + 1,
            }
        })
    })

}

// 是否收藏 点赞
const hasCollectLike_ = async (req, res) => {
    if(req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const details = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (details === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        return res.send({
            code: 1,
            msg: '查询成功!',
            data: {
                hasCollect: details.collectList.indexOf(req.session.acntId) !== -1,
                hasLike: details.beLike.indexOf(req.session.acntId) !== -1,
            },
        })
    } else {
        return res.send({
            code: 0,
            msg: '未登录',
            data: {},
        })
    }
}

// 是否是该文章作者
const isAuthor_ = async (req, res) => {
    if (req.session.acntId) {
        if (req.body.id === undefined) {
            return res.send({
                code: 0,
                msg: '参数错误!',
                data: {},
            })
        }
        const detail = await Article.findOne({_id: mongoose.Types.ObjectId(req.body.id)}).exec();
        if (detail === null) {
            return res.send({
                code: 0,
                msg: '404',
                data: {},
            })
        }
        return res.send({
            code: 1,
            msg: '查询成功!',
            data: {
                is: detail.author === req.session.acntId,
            },
        })
    } else {
        return res.send({
            code: 0,
            msg: '未登录!',
            data: {},
        })
    }
}

// 下载文章md
const downloadMD_ = async (req, res) => {
    if (req.body.pathname === undefined) {
        return res.send({
            code: 0,
            msg: '参数错误!',
            data: {}
        })
    }
    const fileContent = await new Promise((resolve, reject) => {
        try {
            let data = fs.readFileSync( 'public/' + req.body.pathname)
            resolve(data.toString())
        } catch(err) {
            resolve(false);
        }
    })
    if (!fileContent) {
        return res.send({
            code: 0,
            msg: '读取.md文件失败!',
            data: {},
        })
    }
    return res.send({
        code: 1,
        msg: '读取成功!',
        data: fileContent,
    })
}

const routeList = {
    uploadImg: uploadImg_,
    publish: publish_,
    articleDetail: articleDetail_,
    downloadMD: downloadMD_,
    isAuthor: isAuthor_,
    hasCollectLike: hasCollectLike_,
    edit: edit_,
    articleLike: articleLike_,
    articleLikeC: articleLikeC_,
    articleDel: articleDel_,
    collect: collect_,
    collectC: collectC_,
    comment: comment_,
    commentLike: commentLike_,
    commentLikeC: commentLikeC_,
    commentDel: commentDel_,
}


Object.keys(routeList).forEach(key => {
    article.post(`/${key}`, routeList[key]);
})

module.exports = article;
