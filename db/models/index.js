import mongoose from 'mongoose';

import { acntSchema, recordSchema, messageSchema, articleSchema, topicSchema } from './../schemas/index';

const Acnt = mongoose.model('acnts', acntSchema);
const Record = mongoose.model('records', recordSchema);
const Message = mongoose.model('messages', messageSchema);
const Article = mongoose.model('articles', articleSchema);
const Topic = mongoose.model('topics', topicSchema);

module.exports = {
    Acnt,
    Record,
    Message,
    Article,
    Topic
};