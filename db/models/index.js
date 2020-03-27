import mongoose from 'mongoose';

import { acntSchema, recordSchema, messageSchema, articleSchema, topicSchema, prefSchema } from './../schemas/index';

const Acnt = mongoose.model('acnts', acntSchema);
const Record = mongoose.model('records', recordSchema);
const Message = mongoose.model('messages', messageSchema);
const Article = mongoose.model('articles', articleSchema);
const Topic = mongoose.model('topics', topicSchema);
const Pref = mongoose.model('prefs', prefSchema);

module.exports = {
    Acnt,
    Record,
    Message,
    Article,
    Topic,
    Pref,
};