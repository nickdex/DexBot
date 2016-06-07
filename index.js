var Botkit = require('botkit')
var os = require('os')

var config = require('./config')
var client = require('./lib/torrent-client.js')
var TOKEN = config().SLACK_BOT_TOKEN

var controller = Botkit.slackbot({
  debug: true
})

var bot = controller.spawn({
  token: TOKEN
}).startRTM()

// =========================================

controller.hears(['list torrents'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.reply(message, 'Printing torrents')
  var info = null
  // get list and set it to message
  bot.reply(message, 'End of message')
})

controller.hears(['progress'], 'direct_message,direct_mention,mention', function (bot, message) {
  // Start conversation about torrent
  bot.startConversation(message, function (err, convo) {
    if (err) {
      bot.botkit.log('Something bad happened \n' + err)
    }
    convo.ask('Please tell me the id of torrent', function (response, convo) {
      convo.say('Here you go')
      // get torrent details from infoHash and send it to user
      convo.say(details)

      convo.next()
    })

    convo.on('end', (convo) => {
      if (convo === 'completed') {
        convo.say("That's it for now. Let me know if you have more queries")
      } else {
        // this happens if the conversation ended prematurely for some reason
        bot.api.reactions.add(
          {
            timestamp: message.ts,
            channel: message.channel,
            name: 'sad'
          })
        bot.reply(message, 'Erck! Something terrible happened, can you please start again')
      }
    })
  })
})

//
controller.hears(['add torrent'], 'direct_message,direct_mention,mention', function (bot, message) {
  // Start conversation about torrent
  bot.startConversation(message, function (err, convo) {
    if (err) {
      bot.botkit.log('Error while starting conversation about torrent')
    } else {
      convo.ask("I'm happy to help.\nPlease send me the magnet URI", function (response, convo) {
        convo.say("Awesome, I'll start downloading it right away")
        // add Torrent from magnet URI
        // get infoHash and send to user
        var infoHash = client.addTorrent(response.text)
        convo.say("Here's the infoHash for checking status later on\n" + infoHash)
        // TODO test code for downloading torrent
        convo.next()
      })
    }

    convo.on('end', (convo) => {
      if (convo.status === 'completed') {
        bot.reply(message, 'OK! I am downloading ')
      } else {
        // this happens if the conversation ended prematurely for some reason
        bot.api.reactions.add({
          timestamp: message.ts,
          channel: message.channel,
          name: 'sad'
        })
        bot.reply(message, 'Erck! Something terrible happened, can you please start again')
      }
    })
  })
})

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face'
  }, function (err, res) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction :/', err)
    }
  })

  controller.storage.users.get(message.user, function (err, user) {
    if (err) {
      bot.botkit.log('Error while loading user value from db')
    }
    if (user && user.name) {
      bot.reply(message, 'Hello ' + user.name + '!!')
    } else {
      bot.reply(message, 'Hello.')
    }
  })
})

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function (bot, message) {
  controller.storage.users.get(message.user, function (err, user) {
    if (err) {
      bot.botkit.log('Error please check')
    }
    if (user && user.name) {
      bot.reply(message, 'Your name is ' + user.name)
    } else {
      bot.startConversation(message, function (err, convo) {
        if (!err) {
          convo.say('I do not know your name yet!')
          convo.ask('What should I call you?', function (response, convo) {
            convo.ask('You want me to call you `' + response.text + '`?', [{
              pattern: 'yes',
              callback: function (response, convo) {
                // since no further messages are queued after this,
                // the conversation will end naturally with status == 'completed'
                convo.next()
              }
            }, {
              pattern: 'no',
              callback: function (response, convo) {
                // stop the conversation. this will cause it to end with status == 'stopped'
                convo.stop()
              }
            }, {
              default: true,
              callback: function (response, convo) {
                convo.repeat()
                convo.next()
              }
            }])

            convo.next()
          }, {
            'key': 'nickname'
          }) // store the results in a field called nickname

          convo.on('end', function (convo) {
            if (convo.status === 'completed') {
              bot.reply(message, 'OK! I will update my dossier...')

              controller.storage.users.get(message.user, function (err, user) {
                if (err) {
                  bot.botkit.log('Error please check')
                }
                if (!user) {
                  user = {
                    id: message.user
                  }
                }
                user.name = convo.extractResponse('nickname')
                controller.storage.users.save(user, function (err, id) {
                  if (err) {
                    bot.botkit.log('Error please check')
                  }
                  bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.')
                })
              })
            } else {
              // this happens if the conversation ended prematurely for some reason
              bot.reply(message, 'OK, nevermind!')
            }
          })
        }
      })
    }
  })
})

controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.startConversation(message, function (err, convo) {
    if (err) {
      bot.botkit.log('Error please check')
    }
    convo.ask('Are you sure you want me to shutdown?', [{
      pattern: bot.utterances.yes,
      callback: function (response, convo) {
        convo.say('Bye!')
        convo.next()
        setTimeout(function () {
          process.exit()
        }, 3000)
      }
    }, {
      pattern: bot.utterances.no,
      default: true,
      callback: function (response, convo) {
        convo.say('*Phew!*')
        convo.next()
      }
    }])
  })
})

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
  'direct_message,direct_mention,mention',
  function (bot, message) {
    var hostname = os.hostname()
    var uptime = formatUptime(process.uptime())

    bot.reply(message,
      ':robot_face: I am a bot named <@' + bot.identity.name +
      '>. I have been running for ' + uptime + ' on ' + hostname + '.')
  })

function formatUptime (uptime) {
  var unit = 'second'
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'minute'
  }
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'hour'
  }
  if (uptime !== 1) {
    unit = unit + 's'
  }

  uptime = uptime + ' ' + unit
  return uptime
}
