var socket = require('socket.io-client')('http://localhost:6969'); //('http://hollinsky.com:6969');

socket.on('connect', function(){
	socket.emit('setName', "Paul");
	console.log('sent');
});
