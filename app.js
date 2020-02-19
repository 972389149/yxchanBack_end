import db from './db/index';

// import createError from 'createError';
import express from 'express';
import path from 'path';
import logger from 'morgan';

import cookieParser from 'cookie-parser'
import session from 'express-session';
import connectMongo from 'connect-mongo';

import * as routeList from './routes/index';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('YXC'));
app.use(express.static(path.join(__dirname, 'public')));

const MongoStore = connectMongo(session);
app.use(session({
  name: 'YXC',
	secret: 'YXC',
	resave: true,
	saveUninitialized: false,
	cookie: {
    httpOnly: true,
    secure:   false,
    maxAge:   365 * 24 * 60 * 60 * 1000,
  },
	store: new MongoStore({
  	url: 'mongodb://localhost:27666/yuxichan'
	})
}))

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3001");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1');
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
})

Object.keys(routeList).forEach(key => {
  if (key === 'default') return;
  app.use(`/${key}`, routeList[key]);
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  // next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
