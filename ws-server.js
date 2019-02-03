// Load game data
const game = require('./games/mist');

const io = require('socket.io')(8080, {
  path: '/',
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false
});

var rooms = {};
var users = {};
var roomEvidences = {};
var roomVotes = {};
var offlineUsers = {};
var userTimeouts = {};

// Utility function
function flattenEvidenceTree(tree) {
  //console.log("=== Flatten ===")
  //console.log("Input:", tree)
  /* flatten evidence tree by one level */
  let subtrees = {}
  // loop over roots
  for (let root in tree) {
    subtrees[root] = []
    // get branches
    let branches = tree[root]
    // loop over branches
    branches.forEach(branch => {
      if (branch.deeper) { // check if it has children
        // make a copy without children and push
        subtrees[root].push({
          msg: branch.msg,
          deeper: branch.deeper
        })
        // make a new root for the subtree
        let key = branch.msg // use branch msg as key, can be changed
        if (typeof branch.evidences !== 'undefined') {
          subtrees[key] = branch.evidences
        } else {
          subtrees[key] = []
        }
      } else {
        // directly push
        subtrees[root].push(branch)
      }
    })
  }
  //console.log("Output:", subtrees)
  return subtrees
}
function unflattenEvidenceTree(subtrees) {
  /* Reverse operation of flattenEvidenceTree */
  //console.log("=== Unflatten ===")
  //console.log("Input:", subtrees)
  // first find root keys
  let rootKeys = []
  for (let key in subtrees) {
    // check if a key is root key
    let isRoot = true
    for (let _key in subtrees) {
      if (subtrees.hasOwnProperty(_key)) {
        //console.log(_key)
        //console.log("Content: ", subtrees[_key])
        subtrees[_key].forEach(branch => {
          //console.log(branch)
          if (branch.deeper && branch.msg === key) {
            isRoot = false
          }
        })
      }
    }
    if (isRoot) {
      rootKeys.push(key)
    }
  }

  // build from root keys
  newTree = {}
  rootKeys.forEach(rootKey => {
    let branches = []
    subtrees[rootKey].forEach(branch => {
      let _key = branch.msg  // use msg as branch key
      if (branch.deeper && subtrees.hasOwnProperty(_key)) {
        branches.push({
          msg: branch.msg,
          deeper: branch.deeper,
          evidences: subtrees[_key]
        })
      } else {
        branches.push({
          msg: branch.msg,
          deeper: branch.deeper
        })
      }
    })
    newTree[rootKey] = branches
  })
  //console.log("Ouput:", newTree)
  return newTree
}

io.on('connection', client => {
  console.log('[INFO] Client: %s is connected', client.id);

  // Host functions
  // Create room
  client.on('create-room', data => {
    let {username, room, passcode} = data;

    // Load game info
    if (users.hasOwnProperty(username)) { // check if username exists
      console.log("username already exists!")
      client.emit('create-room', {
        status: -1,
        message: "Username already exists!"
      });
      return;
    }
    if (rooms.hasOwnProperty(room)) { // check if room exists
      console.log("room already exists!");
      client.emit("create-room", {
        status: -1,
        message: "Room already exists!"
      });
      return;
    }

    let room_info = {
      id: room,
      passcode: passcode,
      host: username,
      players: {},
      max_players: game.roles.length,
      evidences: {},
      stage: 0
    };

    let user_info = {
      id: username,
      room: room,
      client: client
    };

    client.join(room);
    rooms[room] = room_info;
    users[username] = user_info;

    rooms[room].evidences = initializeEvidences();
    roomEvidences[room] = flattenEvidenceTree(JSON.parse(JSON.stringify(game.evidences))); // create a copy of evidences
    client.emit('create-room', {
      status: 1,
      message: '',
    });

    // send intro message
    client.emit('intro', {
      story: game.intro
    });

    updateRoom(room);
  });

  // Assign roles
  client.on('assign-roles', data => {
    console.log("Receive assign-roles command from host");
    let {room} = data;

    // Check number of players
    if (Object.keys(rooms[room].players).length < rooms[room].max_players) {
      console.log("not enough players");
      client.emit("assign-roles", {
        status: -1,
        message: "Not enough players"
      });
      return;
    }

    console.log("Assigning roles");

    // shuffle player list
    let players = [];
    for (let player in rooms[room].players) {
      players.push(player);
    }

    players = shuffle(players);

    for (let i = 0; i < game.roles.length; i++) {
      rooms[room].players[players[i]].role = game.roles[i];
    }

    client.emit("assign-roles", {
      status: 1,
      message: ''
    });

    updateRoom(room);

    io.in(room).emit("game-update", {
      msg: "角色分配成功"
    })
  });

  // Start game
  client.on('start-game', data => {
    console.log("Starting game");
    let {room} = data;
    rooms[room].stage = 1;
    updateRoom(room);

    for (let player in rooms[room].players) {
      if (rooms[room].players.hasOwnProperty(player)) {
        console.log("Sending story for %s", player);
        let role = rooms[room].players[player].role;
        users[player].client.emit('story', {
          story: game.stories[role]
        });
      }
    }
  });

  // Open search evidences
  client.on('open-r1', data => {
    console.log("receive requests for evidences");
    let {room} = data;
    rooms[room].evidences = initializeEvidences();
    roomEvidences[room] = flattenEvidenceTree(JSON.parse(JSON.stringify(game.evidences))); // create a copy of evidences
    rooms[room].stage = 2;
    updateRoom(room);
    io.in(room).emit('game-update', {
      msg: "第一轮搜证开启"
    })
  });

  client.on('open-r2', data => {
    console.log("receive requests for evidences");
    let {room} = data;
    for (let player in rooms[room].players) {
      if (rooms[room].players.hasOwnProperty(player)) {
        rooms[room].players[player].searches_remain = game.n_searches_r2
      }
    }
    updateRoom(room);
    io.in(room).emit('game-update', {
      msg: "第二轮搜证开启"
    })
  });


  client.on('open-votes', data => {
    console.log("receiving requests to open votes");
    let {room} = data;
    roomVotes[room] = initializeVotes(); // internal book-keeping
    rooms[room].votes = initializeVotes(); // update room
    rooms[room].stage = 3;
    updateRoom(room)
    io.in(room).emit('game-update', {
      msg: "投票已经开启"
    })
  });

  client.on('end-game', data => {
    let {room} = data;
    rooms[room].stage = 4;
    updateRoom(room);

    for (let player in rooms[room].players){
      if (rooms[room].players.hasOwnProperty(player)) {
        console.log("Retrieving final story for %s", player);
        io.in(room).emit('reveal', {
          story: game.reveal
        });
      }
    }
  });

  // Client functions
  // Join a room
  client.on('join-room', data => {
    let {username, room, passcode} = data;

    if (!rooms.hasOwnProperty(room)) { // check room exists
      console.log("Room doesn't exist!");
      client.emit("join-room", {
        status: -1,
        message: "房间不存在"
      });
      return;
    }

    // Room exists
    let room_info = rooms[room];
    if (passcode !== room_info.passcode) { // check passcode
      console.log("wrong passcode");
      client.emit("join-room", {
        status: -1,
        message: "房间密码错误"
      });
      return;
    }

    if (users.hasOwnProperty(username)) { // check username
      // check if user is offline
      if (offlineUsers.hasOwnProperty(username)) {
        console.log("User %s re-enters Room %s", username, room)
        users[username].client = client
        client.join(room)
        delete offlineUsers[username]
        client.emit('join-room',{
            status: 1,
            message: ""
        });


        client.emit('room-update', { // send room update to user
          roomData: rooms[room]
        })

      } else { // user is new
        console.log("User already exists");
        client.emit('join-room', {
          status: -1,
          message: "用户名已存在"
        });
      }
      return;
    }

    // Normal join room
    client.emit('join-room',{
        status: 1,
        message: ""
    });

    let player_info = {
      role: '',
      searches_remain: game.n_searches_r1,
      username: username,
      voted: false
    };

    room_info.players[username] = player_info;
    rooms[room] = room_info;
    let user_info = {
      id: username,
      room: room,
      client: client
    };
    users[username] = user_info;
    client.join(room);

    // send intro message
    client.emit('intro', {
      story: game.intro
    });

    updateRoom(room);
  });

  // Chat
  client.on('chat', data => {
    let {room, from, content} = data;

    // Check if it's host
    let chat_message = {};
    if (from === rooms[room].host) { // it's a host
      chat_message = {
        role: 'Host',
        from: from,
        content: content
      };
    } else { // it's a player
      chat_message = {
        role: rooms[room].players[from].role,
        from: from,
        content: content
      };
    }
    io.in(room).emit('chat-message', chat_message)
  });

  client.on('find-evidence', data => {
    let {room, key} = data;

    let user = getUsername(client);
    if (user === rooms[room].host) {
      console.log("Host action here not allowed!");
      return;
    }

    console.log("%s is searching for evidence", user);
    if (rooms[room].players[user].searches_remain > 0) {
      flattenedEvidenceTree = flattenEvidenceTree(rooms[room].evidences)
      if (typeof flattenedEvidenceTree[key] === 'undefined') {
        flattenedEvidenceTree[key] = []
      }
      if (roomEvidences[room][key].length !== 0) {
      flattenedEvidenceTree[key].push(roomEvidences[room][key].shift());
      rooms[room].evidences = unflattenEvidenceTree(flattenedEvidenceTree)
      rooms[room].players[user].searches_remain -= 1;
      } else {
        console.log("Nothing left to search")
      }
    }
    updateRoom(room)
  });

  client.on('vote', data => {
    let username = getUsername(client);
    let {room, key} = data;

    if (user === rooms[room].host) {
      console.log("Host action here not allowed!");
      return;
    }

    if (rooms[room].players[username].voted) {
      client.emit("vote", {
        status: -1,
        message: "Already voted"
      });
      return;
    } else {
      roomVotes[room][key] += 1;
      rooms[room].players[username].voted = true;
    }
  });

  client.on('show-votes', data => {
    let {room} = data;
    rooms[room].votes = roomVotes[room];
    updateRoom(room)
    io.in(room).emit('game-update', {
      msg: "投票结果已公布"
    })
  });

  // handler for wechat app hide
  client.on("on-hide", data => {
    let {username, room, passcode} = data;
    offlineUsers[username] = data;
    // check timeouts
    if (userTimeouts.hasOwnProperty(username)) {
      clearTimeout(userTimeouts[username])
      delete userTimeouts[username]
      console.log("Timeout for %s is cancelled", username)
    }
    console.log("User: %s in Room: %s minimizes", username, room);
  });

  // handler for wechat app show
  client.on("on-show", data => {
    let {username, room, passcode} = data;
    offlineUsers.splice(offlineUsers.indexOf(username), 1); // remove user
    console.log("User: %s in Room: %s shows up", username, room);
    if (!users.hasOwnProperty(username)) {
      console.log("User is not logged in")
      return
    }
    users[username].client = client; // replace socket connection with new one
    client.join(room)
    client.emit('room-update', { // send room update to user
      roomData: rooms[room]
    })
  });

  client.on('disconnect', () => {
    console.log("[INFO] Client: %s disconnected", client.id);
    let user = getUsername(client);
    if (user === 0) { // user doesn't have a username
      console.log("User doesn't have a username")
    } else { // user has a username
      if (offlineUsers.hasOwnProperty(user)) { // user is minimized
        // do nothing
        console.log("User: %s is minimized", user);
      } else { // user is not minimized
        console.log("User: %s is disconnected, waiting for 30s", user);
        userTimeouts[user] = setTimeout(deleteUser(user), 30000)
      }
    }
  });

  // Close a room and remove all players in it
  client.on('close-room', data => {
    let {room} = data
    if (rooms.hasOwnProperty(room)) {
      for (let user in rooms[room].players) {
        // remove all users
        if (users.hasOwnProperty(user)) {
          delete users[user]
        }
      }
      delete rooms[room]
    }
  })
});

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initializeEvidences() {
  let newEvidences = {};
  for (let key in game.evidences) {
    newEvidences[key] = [];
  }
  return newEvidences;
}

function initializeVotes() {
  let votes = {};
  game.roles.forEach(role => {
    votes[role] = 0;
  });
  return votes
}

function getUsername(client) {
  for (let user in users){
    if (users[user].client.id === client.id) {
      return user
    }
  }
  return 0
}

function updateRoom(room) {
  console.log("Sending room updates to clients");
  io.in(room).emit("room-update", {
    roomData: rooms[room]
  });
}

function deleteUser(user) {
  return function() {
  let room = users[user].room;
  if (!rooms.hasOwnProperty(room)) {
    delete users[user];
    return;
  }
  if (rooms[users[user].room].host === user) {
    console.log('Deleting room ...');
    delete rooms[users[user].room];
  }
  else {
    console.log("[INFO] Delete user %s from %s", user, users[user].room);
    delete rooms[users[user].room].players[user];
  }
  delete users[user];
  updateRoom(room);
  }
}
