const config = require('config');
const mongoose = require('mongoose');
const moment = require('moment');
const request = require('request');
const events = require('events');
const Schema = mongoose.Schema;

const dbCreds = config.get('database');
exports.emitter = new events.EventEmitter();

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

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to database.');
});

exports.stats = {countBySubreddit: {}, countByDate: {}, frequentAuthors: {}, frequentSubs: {}};
function getStats() {
  Promise.all([getCountBySubreddit(), getCountByDate(), getFrequentAuthors(), getFrequentSubs()]).then(function (results) {
    exports.stats.countBySubreddit = results[0];
    exports.stats.countByDate = results[1];
    exports.stats.frequentAuthors = results[2];
    exports.stats.frequentSubs = results[3];
    exports.stats.lastUpdated = new Date();
    exports.emitter.emit('newStats', exports.stats);
  }).catch(function(err) {console.error(err)});
}
function getGBBBInfo() {
  return new Promise(function(resolve, reject) {
    request('https://goodbot-badbot.herokuapp.com/all_filter', (err, res, body) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      var re = /[\sa-z<>]+(\d+)[\sa-z<>\/]+='[a-z:/\.]+\/darnbot'[\sa-z<>\/]+(\d+\.?\d*)<\/td>[\sa-z<>="]+(\d+)[\sa-z<>\/="]+(\d+)/gi;
      var result = re.exec(body);
      if (!result || result.length != 5) {
        console.log('NOPE');
        reject('No GBBB result');
      }
      resolve(result)
    });
  }).then(function (res) {
    exports.emitter.emit('GBBB', {rank: res[1], score: res[2], good: res[3], bad: res[4]});
  }).catch(function (err) {
    console.log(err)
  });
}
getStats();
getGBBBInfo();
setInterval(function () {
  console.log('Refreshing stats.');
  getStats();
  getGBBBInfo();
},2*60*1000) // 2 minutes

function getCountBySubreddit () {
  return new Promise(function(resolve, reject) {
    Comment.aggregate([
      {
        "$project": {
          subreddit: 1,
          darnCount: 1,
          _id: 0
        }
      },
      {
        "$group": {
          _id: "$subreddit",
          commentCount: { $sum: 1 },
          darnCount: { $sum: "$darnCount" }
        }
      },
      {
        "$sort": { commentCount: -1 },
      }
    ], function(err, result) {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function getCountByDate () {
  return new Promise(function(resolve, reject) {
    Comment.aggregate([
      {
        $sort: { created_iso: -1 }
      },
      {
        $project: {
          "y": {"$year": "$created_iso"},
          "m": {"$month": "$created_iso"},
          "d": {"$dayOfMonth": "$created_iso"},
          "darnCount": "$darnCount"
        }
      },
      {
        $group: {
          _id: {
            "year": "$y",
            "month": "$m",
            "day": "$d"
          },
          count: {$sum: 1},
          darnCount: {$sum: "$darnCount"}
        }
      },
      {
        $limit: 30
      },
      {
        $project: {
          _id: 0,
          count: 1,
          darnCount: 1,
          date: { $concat: [{$substr:["$_id.year", 0, -1 ]}, "-", {$substr:["$_id.month", 0, -1 ]}, "-", {$substr:["$_id.day", 0, -1 ]}] }
        }
      },
      {
        $sort: { date: 1 }
      }
    ], function(err, result) {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function getFrequentAuthors () {
  return new Promise(function(resolve, reject) {
    Comment.aggregate([
      {
        "$project": {
          author: 1,
          darnCount: 1,
          _id: 0
        }
      },
      {
        "$group": {
          _id: "$author",
          commentCount: { $sum: 1 },
          darnCount: { $sum: "$darnCount" }
        }
      },
      {
        "$sort": { commentCount: -1 }
      },
      {
        "$limit": 12
      }
    ], function(err, result) {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function getFrequentSubs () {
  return new Promise(function(resolve, reject) {
    Comment.aggregate([
      {
        "$project": {
          subreddit: 1,
          darnCount: 1,
          _id: 0
        }
      },
      {
        "$group": {
          _id: "$subreddit",
          commentCount: { $sum: 1 },
          darnCount: { $sum: "$darnCount" }
        }
      },
      {
        "$sort": { commentCount: -1 }
      },
      {
        "$limit": 10
      }
    ], function(err, result) {
      if (err) return reject(err);
      resolve(result);
    });
  });
}


exports.Comment = Comment;
exports.db = db;
