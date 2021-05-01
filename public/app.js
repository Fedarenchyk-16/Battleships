document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  const width = 10
  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false
  let shotFired = -1
  //Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width*2, width*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width*2, width*3, width*4]
      ]
    },
  ]

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Select Player Mode
  if (gameMode === 'singlePlayer') {
    startSinglePlayer()
  } else {
    startMultiPlayer()
  }

  // Multiplayer
  function startMultiPlayer() {
    var socket = io.connect();

    // У каждого пользователя будет случайный стиль для блока с сообщенями,
    // поэтому в этом кусочке кода мы получаем случайные числа
    var min = 1;
    var max = 6;
    var random = Math.floor(Math.random() * (max - min)) + min;

    // Устаналиваем класс в переменную в зависимости от случайного числа
    // Эти классы взяты из Bootstrap стилей
    var alertClass;
    switch (random) {
      case 1:
        alertClass = 'secondary';
        break;
      case 2:
        alertClass = 'danger';
        break;
      case 3:
        alertClass = 'success';
        break;
      case 4:
        alertClass = 'warning';
        break;
      case 5:
        alertClass = 'info';
        break;
      case 6:
        alertClass = 'light';
        break;
    }

    $(function(){
      //var socket = io.connect();
      var $form = $("#messForm");
      var $name = $("#name");
      var $textarea = $("#message");
      var $all_messages = $("#all_mess");

      $form.submit(function (event){
        event.preventDefault();
        socket.emit("send mess", {mess: $textarea.val(), className: alertClass});
      })

      socket.on('clear-area', bool => {
        if (bool){
          $textarea.val('');
        }else{
          console.log('no');
          infoDisplay.innerHTML = 'There is no one to send a message';
        }
      })

      socket.on("add mess", function(data, name){
        const div = document.createElement('div');
        div.classList.add('message');
        div.innerHTML = `<p class="meta">${name} <span>${data.time}</span></p>
    <p class="text">${data.mess}</p>`;
        document.querySelector('.chat-messages').appendChild(div);
        objDiv = document.querySelector('.chat-messages');
        objDiv.scrollTop = objDiv.scrollHeight;
        //$all_messages.append("<div class='alert alert-" + data.className + "'><b>" + data.name + "</b>: " + data.mess + "</div>");
      });
    });

    // Get your player number
    socket.on('player-number', num => {
      if (num === -1) {
        infoDisplay.innerHTML = "Sorry, the server is full";
        showFullMessage();
      } else {
        playerNum = parseInt(num)
        if(playerNum === 1) currentPlayer = "enemy"

        console.log(playerNum)

        // Get other player status
        socket.emit('check-players')
      }
    })

    function showFullMessage(){
      let body = document.getElementById('body');
      let outer = document.getElementById('outer');
      outer.remove();

      let container = document.createElement('div');
      container.classList.add('container');
      container.classList.add('fullInfo');
      container.innerText = "🥺 Sorry, server is full.\n Try again later."

      body.appendChild(container);
    }

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    // On enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
        setupButtons.style.display = 'none'
      }
    })

    // Check player status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnected(i)
        if(p.ready) {
          playerReady(i)
          if(i !== playerReady) enemyReady = true
        }
      })
    })

    // On Timeout
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'You have reached the 10 minute limit'
    })

    // Ready button click
    startButton.addEventListener('click', () => {
      if(allShipsPlaced) playGameMulti(socket)
      else infoDisplay.innerHTML = "Please place all ships"
    })

    // Setup event listeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if(currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          socket.emit('fire', shotFired)
        }
      })
    })

    // On Fire Received
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      playGameMulti(socket)
    })

    // On Fire Reply Received
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  // Single Player
  function startSinglePlayer() {
    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.addEventListener('click', () => {
      setupButtons.style.display = 'none'
      playGameSingle()
    })
  }

  function matrix(m, n) {
    return Array.from({
      // generate array of length m
      length: m
      // inside map function generate array of size n
      // and fill it with `0`
    }, () => new Array(n).fill(0));
  };

  function checkForShips() {


  }

  function canPlaceShip(y, x, vertical, l, matrix){
    console.log("------------------------------------");
    console.log("y " +y);
    console.log("x " + x);
    console.log("vertical  " + vertical);
    if ( x < 0 || y < 0 || 10 <= x || 10 <= y ) return false;
    console.log("no return 1");
    console.log("y+l= " + (y+l));
    if ( !vertical && 11 <= y + l ) return false;
    console.log("no return 2");
    console.log("x+l= " + (x+l));
    if ( vertical && 11 <= x + l ) return false;
    console.log("no return 3");

    let minX = Math.max( 0, x - 1 );
    console.log("minx "+minX);
    let minY = Math.max( 0, y - 1 );
    console.log("miny "+minY);
    let maxX = Math.min( 10 - 1, x + (!vertical ? 1 : l) );
    console.log("maxx "+maxX);
    let maxY = Math.min( 10 - 1, y + (!vertical ? l : 1) );
    console.log("maxy "+maxY);

    // сама проверка
    for ( let x = minX; x <= maxX; x++ ) {
      for ( let y = minY; y <= maxY; y++ ) {
        console.log(matrix[x][y]);
        if (matrix[x][y] === 1) return false;
      }
    }
    console.log(matrix);
    return true;
  }

  function makeBlock(y, x, vertical, l, matrix) {
    let minX = Math.max( 0, x - 1 );
    console.log("minx "+minX);
    let minY = Math.max( 0, y - 1 );
    console.log("miny "+minY);
    let maxX = Math.min( 10 - 1, x + (!vertical ? 1 : l) );
    console.log("maxx "+maxX);
    let maxY = Math.min( 10 - 1, y + (!vertical ? l : 1) );
    console.log("maxy "+maxY);

    // сама проверка
    for ( let x = minX; x <= maxX; x++ ) {
      for ( let y = minY; y <= maxY; y++ ) {
        console.log(matrix[x][y]);
        if (matrix[x][y] === 1) return true;
      }
    }
    console.log(matrix);
    return false;
  }

  let matr = matrix(10, 10);
  let myMatrOfShips = matrix(10, 10);

  //Create Board
  function createBoard(grid, squares) {
    for (let i = 0; i < width*width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  //Draw the computers ships in random locations
  function generate(ship) {
    // получаем коэффициенты определяющие направление расположения корабля
    // kx == 0 и ky == 1 — корабль расположен горизонтально,
    // kx == 1 и ky == 0 - вертикально.

    let isFiled;
    do {
      // console.log("ONEEEEEEEEEEEEEEE")
      let kx = Math.round(Math.random());
      let ky = (kx === 0) ? 1 : 0;
      console.log("kx " + kx);
      // console.log(ky);

      let x;
      let y;
      // console.log('length ' + ship.directions[0].length);
      if (kx === 0) {
        x = Math.abs(Math.floor(Math.random() * 10 - ship.directions[0].length));
        y = Math.abs(Math.floor(Math.random() * 9));
      } else {
        x = Math.abs(Math.floor(Math.random() * 9));
        y = Math.abs(Math.floor(Math.random() * 10 - ship.directions[0].length));
      }
      console.log(x);
      console.log(y);

      isFiled = makeBlock(x, y, kx, ship.directions[0].length, matr);
      // console.log(isFiled);
      if (!isFiled) {
        for (let i = 0; i < computerSquares.length; i++) {
          if (i === x + y * 10) {
            // console.log(i);
            if (kx === 0) {
              for (let j = 0; j < ship.directions[0].length; j++) {
                computerSquares[i + j].classList.add('taken', ship.name);
              }
              for (let j = 0; j < ship.directions[0].length; j++) {
                matr[y][x + j] = 1;
              }
              break;
            } else {
              for (let j = 0; j < ship.directions[0].length; j++) {
                computerSquares[i + j * 10].classList.add('taken', ship.name);
              }
              for (let j = 0; j < ship.directions[0].length; j++) {
                matr[y + j][x] = 1;
              }
              break;
            }
          }
        }
      }
    }while (isFiled);
  }
  

  //Rotate the ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      // console.log(isHorizontal)
      return
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      // console.log(isHorizontal)
      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  //move around user ship
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))

  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    // console.log('drag leave')
  }

  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    console.log(lastShipIndex);

    let selectedShipIndex;

    let x;
    let y;
    let length = 0;
    let shipLastId;
    //console.log("start y " + y)
    if (isHorizontal) {
      shipLastId = lastShipIndex + parseInt(this.dataset.id)
      console.log(shipLastId)

      selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

      shipLastId = shipLastId - selectedShipIndex
      console.log(shipLastId)

      x = Math.floor(shipLastId / 10);
      console.log("x " + x)
      y = shipLastId % 10;
      console.log("start y " + y)

      shipLastId = lastShipIndex + parseInt(this.dataset.id)
      console.log("first last id " + shipLastId);

      selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

      shipLastId = shipLastId - selectedShipIndex
      console.log("second last id " + shipLastId)
    }else{
      let dragedIndex = parseInt(selectedShipNameWithIndex.substr(-1))
      console.log("this current index "+ dragedIndex);
      console.log("this dataset "+ parseInt(this.dataset.id));
      if (dragedIndex === 0){
        console.log("взял за бошку");
        x = Math.floor(parseInt(this.dataset.id) / 10);
        console.log("x " + x)
        y = parseInt(this.dataset.id) % 10;
        console.log("start y " + y)
      }else{
        x = Math.floor((parseInt(this.dataset.id)-(dragedIndex*10)) / 10);
        console.log("x " + x)
        y = parseInt(this.dataset.id) % 10;
        console.log("start y " + y)
      }
    }
    // const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]
    // const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]

    // let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    // let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    // selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))
    //
    // shipLastId = shipLastId - selectedShipIndex
    // console.log(shipLastId)
    for (let i = 0; i < shipArray.length; i++) {
      if (shipArray[i].name === shipClass){
        if (isHorizontal) {
          console.log('shipppppp finded 1');
          console.log('length ' + shipArray[i].directions[0].length);
          console.log('res=  ' + y + " - " + shipArray[i].directions[0].length);
          y = (shipLastId % 10) - shipArray[i].directions[0].length + 1;
          length = shipArray[i].directions[0].length;
        }else{
          console.log('shipppppp finded 2');
          console.log('length ' + shipArray[i].directions[0].length);
          // console.log('res=  ' + x + " - " + shipArray[i].directions[0].length);
          // x = (shipLastId % 10) - shipArray[i].directions[0].length + 1;
          length = shipArray[i].directions[0].length;
        }
      }
    }
    console.log("y " + y)

    if (canPlaceShip(y, x, !isHorizontal ? 1 : 0, length, myMatrOfShips)){
      console.log("IS EMPTY");
      //console.log(canPlaceShip(x, y, !isHorizontal ? 0 : 1, length, myMatrOfShips));
      if (isHorizontal) {
        console.log('horizontal');
        for (let i=0; i < draggedShipLength; i++) {
          let directionClass
          if (i === 0) directionClass = 'start'
          if (i === draggedShipLength - 1) directionClass = 'end'
          userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
        }
        for (let j = 0; j < length; j++) {
          myMatrOfShips[x][y + j] = 1;
        }
        //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
        //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
      } else if (!isHorizontal) {
        console.log('not horizontal');
        for (let i=0; i < draggedShipLength; i++) {
          let directionClass
          if (i === 0) directionClass = 'start'
          if (i === draggedShipLength - 1) directionClass = 'end'
          //userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken',shipClass)
          userSquares[(y+ (x*10)) + 10 * i].classList.add('taken', 'vertical', directionClass, shipClass)
        }
        for (let j = 0; j < length; j++) {
          //myMatrOfShips[x + j][y] = 1;
          myMatrOfShips[x+j][y] = 1;
        }
      } else return

      displayGrid.removeChild(draggedShip)

    }else{
      console.log("IS FILLED");
    }

    // if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
    //     for (let i=0; i < draggedShipLength; i++) {
    //         let directionClass
    //         if (i === 0) directionClass = 'start'
    //         if (i === draggedShipLength - 1) directionClass = 'end'
    //         userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
    //     }
    //     //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
    //     //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
    // } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
    //     for (let i=0; i < draggedShipLength; i++) {
    //         let directionClass
    //         if (i === 0) directionClass = 'start'
    //         if (i === draggedShipLength - 1) directionClass = 'end'
    //         userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken', 'vertical', directionClass, shipClass)
    //     }
    // } else return
    //
    // displayGrid.removeChild(draggedShip)
    // if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
  }

  function dragEnd() {
    // console.log('dragend')
  }

  // Game Logic for MultiPlayer
  function playGameMulti(socket) {
    let info = document.getElementById('info');
    setupButtons.style.display = 'none'
    if(isGameOver) return
    if(!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if(enemyReady) {
      if(currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Your Go';
        // info.innerText = "Information will be here...";
      }
      if(currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Enemy's Go";
        // info.innerText = "Information will be here...";
      }
    }else{
      info.innerText = "Waiting for opponent...";
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  // Game Logic for Single Player
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Your Go'
      computerSquares.forEach(square => square.addEventListener('click', function(e) {
        shotFired = square.dataset.id
        revealSquare(square.classList)
      }))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Computers Go'
      setTimeout(enemyGo, 1000)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) destroyerCount++
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
    } else {
      enemySquare.classList.add('miss')
    }
    checkForWins()
    currentPlayer = 'enemy'
    if(gameMode === 'singlePlayer') playGameSingle()
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0


  function enemyGo(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].classList.contains('boom')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'boom' : 'miss')
      if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++
      if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++
      if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++
      if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++
      if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++
      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    currentPlayer = 'user'
    turnDisplay.innerHTML = 'Your Go'
  }

  function checkForWins() {
    let enemy = 'computer'
    if(gameMode === 'multiPlayer') enemy = 'enemy'
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer 👍⚓️🛳`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine 👍⚓️🛳`
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser 👍⚓️🛳`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship 👍⚓️🛳`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier 👍⚓️🛳`
      carrierCount = 10
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy} sunk your destroyer ‼️⚠️🔥`
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `${enemy} sunk your submarine ‼️⚠️🔥`
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy} sunk your cruiser ‼️⚠️🔥`
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy} sunk your battleship ‼️⚠️🔥`
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `${enemy} sunk your carrier ‼️⚠️🔥`
      cpuCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "YOU WIN"
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    startButton.removeEventListener('click', playGameSingle)
  }
})
