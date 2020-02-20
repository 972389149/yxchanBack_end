const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const topicSchema = new Schema({
	list: Array,
});
module.exports = topicSchema;
