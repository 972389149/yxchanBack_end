import mongoose from 'mongoose';
import topicSchema from './../schemas/topic';

const Topic = mongoose.model('topics', topicSchema);
module.exports = Topic;