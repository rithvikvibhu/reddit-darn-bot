const config = require('config');
const mongoose = require('mongoose');
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
  created_iso: Date,
  parent_id: String,
  permalink: String,
  is_submitter: Boolean,
  darnCount: Number
});

exports.Comment = mongoose.model('Comment', commentSchema);

mongoose.connect(`mongodb://${dbCreds.username}:${dbCreds.password}@${dbCreds.host}:${dbCreds.port}/${dbCreds.db}`);

var db = mongoose.connection;
exports.db = db;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to database.');
});
