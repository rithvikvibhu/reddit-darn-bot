// process.env.NODE_ENV = 'testing';
process.env.NODE_ENV = 'production';

const Snooper = require('reddit-snooper');
const request = require('request');
const config = require('config')
const events = require('events');

const database = require('./database');

const botName = 'darnbot';
const accounts = JSON.parse(JSON.stringify(config.get('accounts')));
const multiName = config.get('multiName');
var counter = 0;
var subsList = [];
var subs = '';

console.log('Available accounts:', Object.keys(accounts));
console.log('botName: '+ botName);
console.log('multiName: '+ multiName);

const snooper = new Snooper(accounts[botName]);
module.exports = new events.EventEmitter();

function getSubs () {
  return new Promise(function(resolve, reject) {
    snooper.api.get(`/api/multi/user/${botName}/m/${multiName}`, {}, function (err, statusCode, res) {
      if (err) {
        console.log(err);
        reject(err);
      }
      res.data.subreddits.forEach(function(sub) {
        subsList.push(sub.name)
      });
      subs = subsList.join('+');
      module.exports.emit('updateSubs', subsList);
      console.log('Listening on:', subsList);
      resolve();
    });
  });
}

function getLatestCount () {
  return new Promise(function(resolve, reject) {
    request(`https://www.reddit.com/user/${botName}/comments.rss`, (err, res, body) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      // var re = /Darn[ \^]*Counter:[ \^]*(\d+)/gi;
      var re = /Darn ?Counter: ?(\d+)/gi; 
      var result = re.exec(body);
      if (!result || !result[1]) {
        console.log('Cannot get latest count. Exiting.');
        console.log(body);
        reject();
      }
      console.log('Setting counter to', result[1]);
      counter = parseInt(result[1]);
      module.exports.emit('updateCounter', counter);
      resolve();
    });
  });
}

function listenForComments () {
  snooper.watcher.getCommentWatcher(subs).on('comment', function(comment) {
    if (comment.data.author == botName) {return;}
    console.log('u/' + comment.data.author + ' posted', comment.data.body.replace(/[\n\r]/gm,'').substring(0, 20));
    var count = (comment.data.body.match(/darn/gi) || []).length;
    if (count) {
      var commentToSave = new database.Comment(comment.data);
      commentToSave.save(function (err, comment) {
        if (err) return console.error(err);
        console.log('Saved comment', comment.id);
      });
      counter += count;
      console.log(count, 'Darn(s)! Updating counter to', counter);
      module.exports.emit('updateCounter', counter);
      module.exports.emit('newComment', {body: comment.data.body, link: 'https://www.reddit.com'+comment.data.permalink, author: comment.data.author});
      postComment(comment);
    }
  }).on('error', console.error);
}

function postComment (ref) {
  snooper.api.post("/api/comment", {
      api_type: "json",
      text: `What a ***darn*** shame...\n\n---\n^^DarnCounter:${counter} ^^| ^^DM ^^me ^^with: ^^'blacklist-me' ^^to ^^be ^^ignored`,
      thing_id: ref.data.name
  }, function (err, statusCode, data) {
      if (!err) {
        console.log('Replied to comment: ' + ref.data.name)
      } else {
        console.log(err);
      }
  })
}

database.emitter.on('newStats', function(stats) {
  module.exports.emit('newStats', stats);
});

getSubs().then(getLatestCount).then(listenForComments).catch(e => console.error(err));
