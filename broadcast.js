var io = require('socket.io')(6969);

var games = [];

io.on('connection', function(socket)
{
	var user = {
		coins: 0,
		location: {'lat': 0, 'lon': 0}
	};
	
	socket.on('setName', function(name)
	{
		user.name = name;
		socket.emit('nameSet', name);
	});
	
	socket.on('createGame', function(name, password)
	{
		if(findGameByName(name))
		{
			socket.emit('createGameError', "Game name already exists.");
			return;
		}
		var game = {
			name: name.toUpperCase().toLowerCase(),
			password: password,
			creator: user.name,
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
			]
		};
		games.push(game);
		socket.emit('gameCreated', game);
	});
	
	socket.on('joinGame', function(gameid)
	{
		var gameIndex = findGameIndexByName(gameid)
		if(!gameIndex)
		{
			socket.emit('joinGameError', "Game does not exist.");
			return;
		}
		user.team = -1;
		game[gameIndex].spectators.push(user);
		io.to(gameid + '-all').emit('playerJoined', user.name);
		socket.join(gameid + '-all');
		socket.join(gameid + '-spectators');
		socket.emit('gameJoined', gameid);
		user.game = gameid;
	});
	
	socket.on('switchTeams', function(newteam)
	{
		var gameIndex = findGameIndexByName(user.game);
		if(!gameIndex)
		{
			socket.emit('switchTeamError', "Game ID not found.");
			return;
		}
		if(user.team === -1)
		{
			var userIndex = findIndexByName(games[gameIndex].spectators, user.name);
			if(userIndex)
			{
				games[gameIndex].spectators.splice(userIndex, 1);
				user.team = newteam;
				socket.leave(user.game + '-spectators');
			}
			else
			{
				socket.emit('switchTeamError', "Teams are screwed up for some reason.");
				return;
			}
		}
		else
		{
			var userIndex = findIndexByName(games[gameIndex].teams[user.team], user.name);
			if(userIndex)
			{
				games[gameIndex].teams[user.team].splice(userIndex, 1);
				user.team = newteam;
				socket.leave(user.game + '-' + user.team);
			}
			else
			{
				socket.emit('switchTeamError', "Teams are screwed up for some reason.");
				return;
			}
		}
		if(newteam === -1)
		{
			games[gameIndex].spectators.push(user);
		}
		else
		{
			games[gameIndex].teams[newteam].push(user);
		}
		socket.join(user.game + '-' + newteam);
		io.to(user.game + '-all').emit('teamSwitched', user.name, newteam);
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
		var gameIndex = findGameIndexByName(user.game);
		if(!gameIndex)
		{
			socket.emit('setTeamNameError', "Game ID not found.");
			return;
		}
		if(games[gameIndex].creator !== user.name)
		{
			socket.emit('setTeamNameError', "You are not the game creator.");
			return;
		}
		games[gameIndex].teams[side].name = newname;
		io.to(gameid + '-all').emit('teamNameSet', side, newname);
	});
});

function findGameByName(gameid)
{
	return games[findGameIndexByName(gameid)];
}

function findGameIndexByName(gameid)
{
	return findIndexByName(gameid, games);
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
	var adjs = ['Super', 'Amazing', 'Ballin'];
	var animals = ['Alligator', 'Crocodile', 'Alpaca', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Donkey', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Buffalo', 'Butterfly', 'Camel', 'Caribou', 'Cat', 'Cattle', 'Cheetah', 'Chimpanzee', 'Chinchilla', 'Cicada', 'Clam', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Cricket', 'Crow', 'Raven', 'Deer', 'Dinosaur', 'Dog', 'Dolphin', 'Porpoise', 'Duck', 'Eel', 'Elephant', 'Elk', 'Ferret', 'Fishfly', 'Fox', 'Frog', 'Toad', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu', 'Wildebeest', 'Goat', 'Goldfish', 'Gorilla', 'Grasshopper', 'Hamster', 'Hare', 'Hedgehog', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Hound', 'Hyena', 'Insect', 'Jackal', 'Jellyfish', 'Kangaroo', 'Wallaby', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Locust', 'Moose', 'Mosquito', 'Mouse', 'Rat', 'Mule', 'Muskrat', 'Otter', 'Ox', 'Oyster', 'Panda', 'Pig', 'Hog', 'Platypus', 'Porcupine', 'Pug', 'Rabbit', 'Raccoon', 'Reindeer', 'Rhinoceros', 'Salmon', 'Sardine', 'Shark', 'Sheep', 'Skunk', 'Snail', 'Snake', 'Spider', 'Squirrel', 'Termite', 'Tiger', 'Trout', 'Turtle', 'Tortoise', 'Walrus', 'Weasel', 'Whale', 'Wolf', 'Wombat', 'Woodchuck', 'Worm', 'Yak', 'Zebra'];
	return (adjs[Math.floor(Math.random()*adjs.length)] + ' ' + animals[Math.floor(Math.random()*animals.length)] + 's');
}

console.log('UltimateFlag Broadcast Server Running on Port 6969');