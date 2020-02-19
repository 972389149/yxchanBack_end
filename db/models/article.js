import mongoose from 'mongoose';
import articleSchema from './../schemas/article';

const Article = mongoose.model('articles', articleSchema);
module.exports = Article;