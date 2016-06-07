'use strict'

var Transmission = require('transmission')
var debug = require('debug')('Transmission')

var transmission = new Transmission({
  'port': '9000', // DEFAULT : 9091
  'host': '192.168.0.126', // DEAFULT : 127.0.0.1
  username: 'nickdex', // DEFAULT : BLANK
  password: 'pitorrent9', // DEFAULT : BLANK
  url: '/torrent/rpc'
})

var path = '/home/nick/Projects/Node/DexBot/test_download/'

// client
module.exports = {
  getClientInfo: getTransmissionStats,
  addTorrent: addTorrent,
  getTorrentDetails: getTorrentDetails,
  startTorrent: startTorrent
}

// Get details of all torrents currently queued in transmission app
function getTransmissionStats () {
  transmission.sessionStats(function (err, result) {
    if (err) {
      debug(err)
    } else {
      debug(result)
    }
  })
}

// Add a torrent by passing a URL to .torrent file or a magnet link
function addTorrent (url) {
  transmission.addUrl(url, {
    'download-dir': path
  }, function (err, result) {
    if (err) {
      return debug(err)
    }
    var id = result.id
    var infoHash = result.hashString
    debug('Just added a new torrent.')
    debug('Torrent ID: ' + id)
    debug('InfoHash is: ' + infoHash)
    return infoHash
  })
}

// Get various stats about a torrent in the queue
function getTorrentDetails (id) {
  transmission.get(id, function (err, result) {
    if (err) {
      throw err
    }
    if (result.torrents.length > 0) {
      // debug(result.torrents[0])         // Gets all details
      debug('Name = ' + result.torrents[0].name)
      debug('Download Rate = ' + result.torrents[0].rateDownload / 1000)
      debug('Upload Rate = ' + result.torrents[0].rateUpload / 1000)
      debug('Completed = ' + result.torrents[0].percentDone * 100)
      debug('ETA = ' + result.torrents[0].eta / 3600)
      debug('Status = ' + getStatusType(result.torrents[0].status))
    }
  })
}

function deleteTorrent (id) {
  transmission.remove(id, true, function (err, result) {
    if (err) {
      debug(err)
    } else {
      debug(result) // Read this output to get more details which can be accessed as shown below.
      // Extra details
      debug('bt.get returned ' + result.torrents.length + ' torrents')
      result.torrents.forEach(function (torrent) {
        debug('hashString', torrent.hashString)
      })
      removeTorrent(id)
    }
  })
}

// To start a paused / stopped torrent which is still in queue
function startTorrent (id) {
  transmission.start(id, function (err, result) {
    if (err) {
      console.error('Error starting torrent, id = ' + id)
    }
    debug('Result is ' + result)
  })
}

// To get list of all torrents currently in queue (downloading + paused)
// NOTE : This may return null if all torrents are in paused state
function getAllActiveTorrents () {
  transmission.active(function (err, result) {
    if (err) {
      debug(err)
    } else {
      for (var i = 0; i < result.torrents.length; i++) {
        debug(result.torrents[i].id)
        debug(result.torrents[i].name)
      }
    }
  })
}

// Pause / Stop a torrent
function stopTorrent (id) {
  transmission.stop(id, function (err, result) {
    if (err) {
      console.error('Error stopping torrent, id = ' + id)
    }
    debug('Result is ' + result)
  })
}

// Pause / Stop all torrent
function stopAllActiveTorrents () {
  transmission.active(function (err, result) {
    if (err) {
      debug(err)
    } else {
      for (var i = 0; i < result.torrents.length; i++) {
        stopTorrent(result.torrents[i].id)
      }
    }
  })
}

// Remove a torrent from download queue
// NOTE : This does not trash torrent data i.e. does not remove it from disk
function removeTorrent (id) {
  transmission.remove(id, function (err) {
    if (err) {
      throw err
    }
    debug('torrent was removed')
  })
}

// Get torrent state
function getStatusType (type) {
  if (type === 0) {
    return 'STOPPED'
  } else if (type === 1) {
    return 'CHECK_WAIT'
  } else if (type === 2) {
    return 'CHECK'
  } else if (type === 3) {
    return 'DOWNLOAD_WAIT'
  } else if (type === 4) {
    return 'DOWNLOAD'
  } else if (type === 5) {
    return 'SEED_WAIT'
  } else if (type === 6) {
    return 'SEED'
  } else if (type === 7) {
    return 'ISOLATED'
  }
}

// test
// getTransmissionStats()
