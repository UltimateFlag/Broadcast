var p2 = require('socket.io-client')('http://localhost:6969');
p2.emit('setName', "Sasha");
p2.on('nameSet', function(p2name)
{
	p2.emit('joinGame', "Charming Gerbil Game", 'hackme');
	p2.on('gameJoined', function(game)
	{
		p2.emit('switchTeams', 1);
	});
});
p2.on('gameStartingIn', function(seconds)
{
	console.log('The game will start in', seconds, 'seconds.');
});
p2.on('gameStart', function(time)
{
	console.log('The game has started as of', time);
});
p2.on('switchTeamError', function(msg)
{
	console.log('P2:', msg);
});