// process.env.NODE_ENV = 'testing';
process.env.NODE_ENV = 'production';

const Snooper = require('reddit-snooper');
const request = require('request');
const moment = require('moment');
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

function getSubs() {
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
      console.log(`Listening on (${subsList.length}):`, subsList);
      resolve();
    });
  });
}

async function getLatestCount() {
  var count, after;
  while (!count) {
    console.log(`Trying to find count after ${after}`);

    await new Promise(function(resolve, reject) {
      request(`https://www.reddit.com/user/${botName}/comments.json` + (after ? `?after=${after}`: ''), (err, res, body) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        var data = JSON.parse(body);

        // var re = /Darn[ \^]*Counter:[ \^]*(\d+)/gi;
        var re = /Darn ?Counter: ?(\d+)/gi;
        var result = re.exec(body);
        console.log('Regex match:', !!result);

        if (!result) {
          after = data.data.after;
          return resolve();
        } else {
          count = parseInt(result[1]);
          return resolve();
        }
      });
    });
  }
  console.log('Setting counter to', count);
  counter = count;
  module.exports.emit('updateCounter', count);
}

function listenForComments() {
  snooper.watcher.getCommentWatcher(subs).on('comment', function(comment) {
    if (comment.data.author == botName) {return;}
    console.log('u/' + comment.data.author + ' posted', comment.data.body.replace(/[\n\r]/gm,'').substring(0, 20));
    var count = (comment.data.body.match(/darn[^(ell)]/gi) || []).length;
    if (count) {
      comment.data.created_iso = moment.unix(comment.data.created_utc).toISOString();
      comment.data.darnCount = count;
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

function postComment(ref) {
  snooper.api.post("/api/comment", {
      api_type: "json",
      text: `What a ***darn*** shame...\n\n---\n^^DarnCounter:${counter} ^^| ^^DM ^^me ^^with: ^^'blacklist-me' ^^to ^^be ^^ignored ^^| ^^More ^^stats ^^available ^^at ^^**[https://darnbot.ml](https://darnbot.ml)**`,
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
database.emitter.on('GBBB', function(res) {
  module.exports.emit('GBBB', res);
});

getSubs().then(getLatestCount).then(listenForComments).catch(e => console.error(err));
