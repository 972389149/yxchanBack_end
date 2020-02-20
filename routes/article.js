import express from 'express';
import mongoose from 'mongoose';
import Article from './../db/models/article';
const article = express.Router()

const getArticleList_ = (req, res) => {
    

}

const routeList = {
    getArticleList: getArticleList_,
}


Object.keys(routeList).forEach(key => {
    article.get(`/${key}`, routeList[key]);
})

module.exports = article;
