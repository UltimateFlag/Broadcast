var socket = require('socket.io-client')('http://hollinsky.com:6969');
var gameName = generateGameName();

socket.on('connect', function()
{
	socket.emit('setName', "Paulo");
	console.log('Logged in to the server.');
	socket.on('nameSet', function(name)
	{
		socket.emit('createGame', gameName, 'hackme');
		socket.on('gameCreated', function(game)
		{
			console.log('Created', game.name, 'with teams', game.teams[0].name, 'and', game.teams[1].name + '.');
			socket.emit('joinGame', gameName, 'hackme');
			socket.on('gameJoined', function(gameid)
			{
				socket.emit('switchTeams', 0);
				socket.on('teamSwitched', function(switcher, team)
				{
					if(switcher === "Paul")
					{
						console.log(switcher, 'has joined team', team.name);
						socket.on('playerJoined', function(newPlayer)
						{
							console.log(newPlayer, 'has joined the game.');
							socket.on('teamSwitched', function(switcher, team)
							{
								if(switcher === "Sasha")
								{
									console.log(switcher, 'has joined team', team.name);
									socket.emit('startGame');
								}
							});
						});
					}
				});
			});		
		});
	});
});

socket.on('switchTeamError', function(msg)
{
	console.log('P1:', msg);
});

function generateGameName()
{
	var animals = ['Alligator', 'Crocodile', 'Alpaca', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Donkey', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Buffalo', 'Butterfly', 'Camel', 'Caribou', 'Cat', 'Cattle', 'Cheetah', 'Chimpanzee', 'Chinchilla', 'Cicada', 'Clam', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Cricket', 'Crow', 'Raven', 'Deer', 'Dinosaur', 'Dog', 'Dolphin', 'Porpoise', 'Duck', 'Eel', 'Elephant', 'Elk', 'Ferret', 'Fishfly', 'Fox', 'Frog', 'Toad', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu', 'Wildebeest', 'Goat', 'Goldfish', 'Gorilla', 'Grasshopper', 'Hamster', 'Hare', 'Hedgehog', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Hound', 'Hyena', 'Insect', 'Jackal', 'Jellyfish', 'Kangaroo', 'Wallaby', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Locust', 'Moose', 'Mosquito', 'Mouse', 'Rat', 'Mule', 'Muskrat', 'Otter', 'Ox', 'Oyster', 'Panda', 'Pig', 'Hog', 'Platypus', 'Porcupine', 'Pug', 'Rabbit', 'Raccoon', 'Reindeer', 'Rhinoceros', 'Salmon', 'Sardine', 'Shark', 'Sheep', 'Skunk', 'Snail', 'Snake', 'Spider', 'Squirrel', 'Termite', 'Tiger', 'Trout', 'Turtle', 'Tortoise', 'Walrus', 'Weasel', 'Whale', 'Wolf', 'Wombat', 'Woodchuck', 'Worm', 'Yak', 'Zebra'];
	return (animals[Math.floor(Math.random()*animals.length)]);
}