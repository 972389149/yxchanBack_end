import mongoose from 'mongoose';
import acntSchema from './../schemas/acnt';

const Acnt = mongoose.model('acnts', acntSchema);
module.exports = Acnt;