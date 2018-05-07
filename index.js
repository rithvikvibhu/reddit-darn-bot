// process.env.NODE_ENV = 'testing';
process.env.NODE_ENV = 'production';

const Snooper = require('reddit-snooper')
const request = require('request');
const config = require('config')

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
      var re = /Darn[ \^]*Counter:[ \^]*(\d+)/gi;
      var result = re.exec(body);
      if (!result || !result[1]) {
        console.log('Cannot get latest count. Exiting.');
        console.log(body);
        reject();
      }
      console.log('Setting counter to', result[1]);
      counter = parseInt(result[1]);
      resolve();
    });
  });
}

function listenForComments () {
  snooper.watcher.getCommentWatcher(subs).on('comment', function(comment) {
    console.log('u/' + comment.data.author + ' posted', comment.data.body);
    if (comment.data.author == botName) {return;}
    var count = (comment.data.body.match(/darn/gi) || []).length;
    console.log(count, 'Darn(s)!');
    if (count) {
      counter += count;
      console.log('Updating counter to', counter);
      postComment(comment);
    }
  }).on('error', console.error);
}

function postComment (ref) {
  snooper.api.post("/api/comment", {
      api_type: "json",
      text: `What a ***darn*** shame...\n\n---\n^^Darn ^^Counter: ^^${counter} ^^| ^^DM ^^me ^^with: ^^'blacklist-me' ^^to ^^be ^^ignored`,
      thing_id: ref.data.name
  }, function (err, statusCode, data) {
      if (!err) {
        console.log('just replied to comment: ' + ref.data.name)
      } else {
        console.log(err);
      }
  })
}

getSubs().then(getLatestCount).then(listenForComments).catch(e => console.error(err));
