const Snooper = require('reddit-snooper')
const request = require('request');
const config = require('config')

var counter = 0;
const botName = 'darnbot';
const accounts = JSON.parse(JSON.stringify(config.get('accounts')));
const snooper = new Snooper(accounts[botName]);

console.log('Available accounts:', Object.keys(accounts));
console.log('botName: '+botName);

// Get latest count from bot's comment history
request('https://www.reddit.com/user/'+botName+'/comments.rss', (err, res, body) => {
  if (err) {
    console.log(err);
    return;
  }
  
  var re = /Darn ?Counter: ?(\d+)/gi;
  var result = re.exec(body);
  if (!result || !result[1]) {
    console.log('Cannot get latest count. Exiting.');
    console.log(body);
    return;
  }
  console.log('Setting counter to', result[1]);
  counter = parseInt(result[1])
  
  // Watch for new comments
  snooper.watcher.getCommentWatcher('test').on('comment', function(comment) {
    console.log('u/' + comment.data.author + ' posted', comment.data.body);
    if (comment.data.author == botName) {return;}
    var count = (comment.data.body.match(/darn/gi) || []).length;
    console.log(count, 'Darn(s)!');
    if (count) {
      counter += count;
      console.log('Updating counter to', counter);
      // Reply to comment
      snooper.api.post("/api/comment", {
          api_type: "json",
          text: `What a ***darn*** shame...

---
^^DarnCounter:${counter} ^^| ^^DM ^^me ^^with: ^^'blacklist-me' ^^to ^^be ^^ignored`,
          thing_id: comment.data.name
      }, function (err, statusCode, data) {
          if (!err) {
            console.log('just replied to comment: ' + comment.data.name)
          } else {
            console.log(err);
          }
      })
    }
  }).on('error', console.error);
  
})
