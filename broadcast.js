var io = require('socket.io')(6969);
var geolib = require('geolib');
var hat = require('hat');

var games = [];

io.on('connection', function(socket)
{
	socket.user = {
		coins: 0,
		location: {'latitude': 0, 'longitude': 0, 'accuracy': 0}
	};
	
	socket.on('setName', function(name)
	{
		socket.user.name = name;
		socket.emit('nameSet', name);
		console.log(name, 'has logged in');
	});
	
	socket.on('createGame', function(name, password)
	{
		if(findGameByName(name))
		{
			socket.emit('createGameError', "Game name already exists.");
			return;
		}
		var game = {
			name: name.gameCase(),
			password: password,
			creator: socket.user.name,
			spectators: [],
			teams: [
				{
					side: 0,
					name: generateTeamName(),
					flags: [],
					players: [],
					score: 0
				},
				{
					side: 1,
					name: generateTeamName(),
					flags: [],
					players: [],
					score: 0
				}
			],
			lastLogicUpdate: new Date().getTime()
		};
		games.push(game);
		socket.emit('gameCreated', game);
		console.log(name, ' game has been created');
	});
	
	socket.on('joinGame', function(gameid, password)
	{
		var gameIndex = findGameIndexByName(gameid.gameCase());
		if(gameIndex === false)
		{
			socket.emit('joinGameError', "Game does not exist.");
			return;
		}
		if(games[gameIndex].password !== password)
		{
			socket.emit('joinGameError', "The password is not correct.");
			return;
		}
		socket.user.team = -1;
		games[gameIndex].spectators.push(socket.user);
		io.to(gameid + '-all').emit('playerJoined', socket.user.name);
		socket.join(gameid + '-all');
		socket.join(gameid + '-spectators');
		socket.emit('gameJoined', games[gameIndex]);
		socket.user.game = gameid;
	});
	
	socket.on('switchTeams', function(newteam)
	{
		console.log(socket.user.name, newteam);
		var gameIndex = findGameIndexByName(socket.user.game);
		if(gameIndex === false)
		{
			socket.emit('switchTeamError', "Game ID not found.");
			return;
		}
		var oldteam = socket.user.team;
		if(socket.user.team === -1)
		{
			var userIndex = findIndexByName(socket.user.name, games[gameIndex].spectators);
			if(userIndex === false)
			{
				socket.emit('switchTeamError', "Teams are screwed up for some reason.");
				return;
			}
			else
			{
				games[gameIndex].spectators.splice(userIndex, 1);
				socket.user.team = newteam;
				socket.leave(socket.user.game + '-spectators');
			}
		}
		else
		{
			var userIndex = findIndexByName(socket.user.name, games[gameIndex].teams[socket.user.team].players);
			if(userIndex === false)
			{
				socket.emit('switchTeamError', "Teams are screwed up for some reason.");
				return;
			}
			else
			{
				games[gameIndex].teams[socket.user.team].players.splice(userIndex, 1);
				socket.user.team = newteam;
				socket.leave(socket.user.game + '-' + socket.user.team);
			}
		}
		if(newteam === -1)
		{
			games[gameIndex].spectators.push(socket.user);
		}
		else
		{
			games[gameIndex].teams[newteam].players.push(socket.user);
		}
		socket.join(socket.user.game + '-' + newteam);
		io.to(socket.user.game + '-all').emit('teamSwitched', socket.user.name, games[gameIndex].teams[newteam], oldteam);
		socket.emit('teamInfo', games[gameIndex].teams[newteam]);
	});
	
	socket.on('getGames', function()
	{
		var sanitized = [];
		games.forEach(function(game)
		{
			sanitized.push({
				name: game.name,
				creator: game.creator,
				teams: game.teams,
				spectators: game.spectators
			});
		});
		socket.emit('gameList', sanitized);
	});
	
	socket.on('setTeamName', function(side, newname)
	{
		var gameIndex = findGameIndexByName(socket.user.game);
		if(gameIndex === false)
		{
			socket.emit('setTeamNameError', "Game ID not found.");
			return;
		}
		if(games[gameIndex].creator !== socket.user.name)
		{
			socket.emit('setTeamNameError', "You are not the game creator.");
			return;
		}
		games[gameIndex].teams[side].name = newname;
		io.to(games[gameIndex].name + '-all').emit('teamNameSet', side, newname);
	});
	
	socket.on('createFlag', function(side, loc)
	{
		var gameIndex = findGameIndexByName(socket.user.game);
		if(gameIndex === false)
		{
			socket.emit('createFlagError', "Game ID not found.");
			return;
		}
		if(games[gameIndex].creator !== socket.user.name)
		{
			socket.emit('createFlagError', "You are not the game creator.");
			return;
		}
		var flag = 
		{
			location: loc,
			id: hat(),
			capturePercentage: 0
		};
		games[gameIndex].teams[side].flags.push(flag);
		io.to(socket.user.game + '-' + side).emit('flagCreated', flag);
		if(socket.user.team !== side)
		{
			socket.emit('flagCreated', flag);
		}
	});
	
	socket.on('deleteFlag', function(side, id)
	{
		var gameIndex = findGameIndexByName(socket.user.game);
		if(gameIndex === false)
		{
			socket.emit('deleteFlagError', "Game ID not found.");
			return;
		}
		if(games[gameIndex].creator !== socket.user.name)
		{
			socket.emit('deleteFlagError', "You are not the game creator.");
			return;
		}
		var flagIndex = findIndexInArray('id', id, games[gameIndex].teams[side].flags);
		if(!flagIndex)
		{
			socket.emit('deleteFlagError', "The flag was not found.");
			return;
		}
		games[gameIndex].teams[side].flags.splice(flagIndex, 1);
		io.to(socket.user.game + '-' + side).emit('flagDeleted', id);
		if(socket.user.team !== side)
		{
			socket.emit('flagDeleted', id);
		}
	});
	
	socket.on('updateLocation', function(location)
	{
		socket.user.location = location;
		socket.emit('locationUpdated');
	});
	
	socket.on('startGame', function()
	{
		var gameIndex = findGameIndexByName(socket.user.game);
		if(gameIndex === false)
		{
			socket.emit('startGameError', "Game ID not found.");
			return;
		}
		if(games[gameIndex].creator !== socket.user.name)
		{
			socket.emit('startGameError', "You are not the game creator.");
			return;
		}
		for(var i = 0; i < 10; i++)
		{
			setTimeout(function(i){
				io.to(socket.user.game + '-all').emit('gameStartingIn', 10-i);
			}, 1000 * i, i);
		}
		setTimeout(function()
		{
			games[gameIndex].started = new Date();
			io.to(socket.user.game + '-all').emit('gameStart', games[gameIndex].started);
		}, 10000);
	});
	
	socket.on('endGame', function()
	{
		var gameIndex = findGameIndexByName(socket.user.game);
		if(gameIndex === false)
		{
			socket.emit('startGameError', "Game ID not found.");
			return;
		}
		if(games[gameIndex].creator !== socket.user.name)
		{
			socket.emit('startGameError', "You are not the game creator.");
			return;
		}
		io.to(games[gameIndex].name + '-all').emit('gameEnd', games[gameIndex]);
		games.splice(gameIndex, 1);
	});
});

setInterval(function(params)
{
	games.forEach(function(game)
	{
		if(game.started)
		{
			gameLogic(game);
		}
	});
}, 250);

function gameLogic(game)
{
	var gameIndex = findGameIndexByName(game.name);
	var thisTime = new Date().getTime();
	var seconds = (thisTime - game.lastLogicUpdate) / 1000;
	games[gameIndex].lastLogicUpdate = thisTime;
	for(var i = 0; i < game.teams.length; i++)
	{
		var team = game.teams[i];
		var captured = 0;
		for(var ii = 0; ii < team.flags.length; ii++)
		{
			var flag = team.flags[ii];
			for(var iii = 0; iii < team.players; iii++)
			{
				var player = team.player[iii];
				var distance = geolib.getDistance(player.location, flag.location);
				if(distance < 5 + player.location.accuracy)
				{
					games[gameIndex].teams[i].flags[ii].capturePercentage += 1.6667 * seconds;
				}
			}
			if(games[gameIndex].teams[i].flags[ii].capturePercentage >= 100)
			{
				captured += 1;
			}
		}
		if(captured >= team.flags.length)
		{
			io.to(games[gameIndex].name + '-all').emit('gameWin', team.side === 1 ? 0 : 1, games[gameIndex]);
			games.splice(gameIndex, 1);
		}
	}
}

function findGameByName(gameid)
{
	return games[findGameIndexByName(gameid)];
}

function findGameIndexByName(gameid)
{
	return findIndexByName(gameid.gameCase(), games);
}

function findIndexByName(value, array)
{
	return findIndexInArray('name', value, array);
}

function findIndexInArray(key, value, array)
{
	var found = false;
	for(var i = 0; i < array.length; i++)
	{
		if(array[i][key] === value)
		{
			found = i;
			break;
		}
	}
	return found;
}

function generateTeamName()
{
	var adjs = ['Super', 'Amazing', 'Ballin', 'Brave', 'Charming', 'Diplomatic', 'Gentle', 'Diligent', 'Fearless', 'Passionate', 'Plucky', 'Powerful', 'Witty', 'Unrelenting', 'Merciful'];
	var animals = ['Alligator', 'Crocodile', 'Alpaca', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Donkey', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Buffalo', 'Butterfly', 'Camel', 'Caribou', 'Cat', 'Cattle', 'Cheetah', 'Chimpanzee', 'Chinchilla', 'Cicada', 'Clam', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Cricket', 'Crow', 'Raven', 'Deer', 'Dinosaur', 'Dog', 'Dolphin', 'Porpoise', 'Duck', 'Eel', 'Elephant', 'Elk', 'Ferret', 'Fishfly', 'Fox', 'Frog', 'Toad', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu', 'Wildebeest', 'Goat', 'Goldfish', 'Gorilla', 'Grasshopper', 'Hamster', 'Hare', 'Hedgehog', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Hound', 'Hyena', 'Insect', 'Jackal', 'Jellyfish', 'Kangaroo', 'Wallaby', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Locust', 'Moose', 'Mosquito', 'Mouse', 'Rat', 'Mule', 'Muskrat', 'Otter', 'Ox', 'Oyster', 'Panda', 'Pig', 'Hog', 'Platypus', 'Porcupine', 'Pug', 'Rabbit', 'Raccoon', 'Reindeer', 'Rhinoceros', 'Salmon', 'Sardine', 'Shark', 'Sheep', 'Skunk', 'Snail', 'Snake', 'Spider', 'Squirrel', 'Termite', 'Tiger', 'Trout', 'Turtle', 'Tortoise', 'Walrus', 'Weasel', 'Whale', 'Wolf', 'Wombat', 'Woodchuck', 'Worm', 'Yak', 'Zebra'];
	return (adjs[Math.floor(Math.random()*adjs.length)] + ' ' + animals[Math.floor(Math.random()*animals.length)] + 's');
}

String.prototype.gameCase = function()
{
	return this.split(' ').map(function(x){ return x.slice(0,1).toUpperCase() + x.slice(1).toUpperCase().toLowerCase(); }).join(' ');
};

console.log('UltimateFlag Broadcast Server Running on Port 6969');