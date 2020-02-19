import express from 'express';
const article = express.Router()
article.get('/', (req, res) => {
    res.send("测试成功！");
})
module.exports = article;
