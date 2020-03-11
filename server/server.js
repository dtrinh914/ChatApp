const app = require('./app');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const redisAdapter = require('socket.io-redis');
const {redisDel} = require('./util/redisUtil');
const {openConnection, storeGroupMsg} = require('./util/mongoUtil');
const {REDIS_CONFIG} = require('./config/config');

//connect socket-io to redis
io.adapter(redisAdapter({...REDIS_CONFIG}));

// open DB connection before starting server and socket listeners
openConnection()
.then( () =>{
    http.listen(5000, ()=> {
        console.log('Server has started');
    });
    
    io.on('connection', (socket) => {
        console.log('a user connected');
    
        //joins room specified by the client
        socket.on('join_room', (room) => {
            socket.join(room);
        });

        //leave room specified by the client
        socket.on('leave_room', (room) => {
            socket.leave(room);
        });
    
        //creates a room specific for each user
        socket.on('user', async (userId) => {
            socket.join(userId);
        })
    
        //tells a specific user to update their pending invite list
        socket.on('update_pendinglist', (userId) => {
            socket.in(userId).emit('update_pendinglist');
        });

        //tells a set of users to leave the group
        socket.on('remove_users', (userIds, groupId) => {
            userIds.forEach(id =>{
                socket.in(id).emit('remove_group', groupId)
            });
        });
    
        //receives msg from client to update a group's member list
        //and sends msg to all client in a group to update their member list
        socket.on('update_memberlist', (groupId) => {
            socket.in(groupId).broadcast.emit('update_memberlist', groupId);
        });

        socket.on('update_status', (groupId, userId, status) =>{
            socket.in(groupId).broadcast.emit('update_status', groupId, userId, status);
        });

        socket.on('update_group', (groupId, groupDescription) => {
            socket.in(groupId).broadcast.emit('update_group', groupId, groupDescription);
        });

        //broadcast to clients in group and then leaves group channel
        socket.on('remove_group', (groupId) => {
            socket.in(groupId).broadcast.emit('remove_group', groupId);
            socket.leave(groupId); 
        });
    
        //Receives messages sent by client and broadcast messages to the specific room
        socket.on('message', async (room, message) => {
            await storeGroupMsg(room,message);
            socket.in(room).broadcast.emit('message', room, message);
        });

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
        
        //broadcast to client to close their connection
        socket.on('closeClient', async (userId) => {
            //remove user Id from redis cache;
            await redisDel(userId);
            socket.in(userId).broadcast.emit('closeClient');
        })
    });
})
.catch(err => {
    console.log(err);
});

