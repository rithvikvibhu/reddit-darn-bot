const config = require('config');
const mongoose = require('mongoose');
const moment = require('moment');
const Schema = mongoose.Schema;

const dbCreds = config.get('database');

var commentSchema = new Schema({
  link_url: String,
  link_title: String,
  link_author: String,
  link_permalink: String,
  link_id: String,
  subreddit: String,
  subreddit_name_prefixed: String,
  subreddit_id: String,
  subreddit_type: String,
  id: String,
  name: String,
  author: String,
  author_flair_text: String,
  body: String,
  body_html: String,
  created: Number,
  created_utc: Number,
  parent_id: String,
  permalink: String,
  is_submitter: Boolean,
});

var Comment = mongoose.model('Comment', commentSchema);
mongoose.connect(`mongodb://${dbCreds.username}:${dbCreds.password}@${dbCreds.host}:${dbCreds.port}/${dbCreds.db}`);
var db = mongoose.connection;

exports.Comment = Comment;
exports.db = db;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to database.');
  Promise.all([getCommentCountBySubreddit(), getFrequentAuthors()]).then(function(results) {
    console.log(results);
  }).catch(function(err) {console.error(err)});
});

function getCommentCountBySubreddit () {
  return new Promise(function(resolve, reject) {
    Comment.aggregate([
      {
        "$project": {
          subreddit: 1,
          _id: 0
        }
      },
      {
        "$group": {
          _id: "$subreddit",
          count: { $sum: 1 }
        }
      },
      {
        "$sort": {
          count: -1
        },
      }
    ], function(err, result) {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function getCommentCountByDate () {
  var current = moment().unix();
  var startOfDay = moment().unix();
}

function getFrequentAuthors () {
  return new Promise(function(resolve, reject) {
    Comment.aggregate([
      {
        "$project": {
          author: 1,
          _id: 0
        }
      },
      {
        "$group": {
          _id: "$author",
          count: { $sum:1 }
        }
      },
      {
        "$sort": { count: -1 }
      }
    ], function(err, result) {
      if (err) return reject(err);
      resolve(result);
    });
  });
}
