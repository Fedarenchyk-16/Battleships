const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 8000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)
var moment = require('moment'); // require

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Handle a socket connection request from web client
const connections = [null, null]
var players = {}, unmatched;

function joinGame(socket){
  //console.log(socket.id);
  players[socket.id] = {
    opponent: unmatched,

    symbol: "X",
    // The socket that is associated with this player
    socket: socket,
  };

  if (unmatched) {
    players[socket.id].symbol = "O";
    players[unmatched].opponent = socket.id;
    unmatched = null;
  } else {
    unmatched = socket.id;
  }
}

function getOpponent(socket) {
  //console.log("in getopponent");
  if (!players[socket.id].opponent) {
    //console.log("in getopponent if");
    return;
  }
  //console.log("in getopponent else");
  return players[players[socket.id].opponent].socket;
};

io.on('connection', socket => {
  // console.log('New WS Connection')

  // Find an available player number
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i
      break
    }
  }

  joinGame(socket);

  if (getOpponent(socket)) {
    //console.log("in the if");
    socket.emit("game.begin", {
      symbol: players[socket.id].symbol,
    });
    getOpponent(socket).emit("game.begin", {
      symbol: players[getOpponent(socket).id].symbol,
    });
  }

  // Tell the connecting client what player number they are
  socket.emit('player-number', playerIndex)

  console.log(`Player ${playerIndex} has connected`)

  // Ignore player 3
  if (playerIndex === -1) return

  connections[playerIndex] = false

  // Tell eveyone what player number just connected
  socket.broadcast.emit('player-connection', playerIndex)

  // Handle Diconnect
  socket.on('disconnect', () => {
    console.log(`Player ${playerIndex} disconnected`)
    connections[playerIndex] = null
    //Tell everyone what player numbe just disconnected
    socket.broadcast.emit('player-connection', playerIndex)
  })

  // On Ready
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex)
    connections[playerIndex] = true
  })

  socket.on("send mess", function(data){
    //io.to(getOpponent(socket).id).emit('add mess', {mess: data.mess, name: data.name, className: data.className})
    io.to(getOpponent(socket).id).emit('add mess', {mess: data.mess, time: moment().format('h:mm a')}, 'Opponent')
    io.to(socket.id).emit('add mess', {mess: data.mess, time: moment().format('h:mm a')}, 'You')
  });

  // Check player connections
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players)
  })

  // On Fire Received
  socket.on('fire', id => {
    console.log(`Shot fired from ${playerIndex}`, id)

    // Emit the move to the other player
    socket.broadcast.emit('fire', id)
  })

  // on Fire Reply
  socket.on('fire-reply', square => {
    console.log(square)

    // Forward the reply to the other player
    socket.broadcast.emit('fire-reply', square)
  })

  // Timeout connection
  setTimeout(() => {
    connections[playerIndex] = null
    socket.emit('timeout')
    socket.disconnect()
  }, 600000) // 10 minute limit per player
})