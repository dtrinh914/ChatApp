import React, {useEffect, useState, useContext} from 'react';
import {useHistory} from 'react-router-dom';
import LeftNav from '../components/LeftNav';
import ChatRoom from '../components/ChatRoom';
import Welcome from '../components/Welcome';
import VideoConference from './VideoConference';
import CircularProgress from '@material-ui/core/CircularProgress';
import axios from 'axios';
import {ChatContext} from '../contexts/chatContext';
import {NavContext} from '../contexts/navContext';
import {makeStyles} from '@material-ui/styles';



const useStyles = makeStyles({
    root:{
        display:'flex',
        height: 'var(--app-height)',
        width: '100vw'
    },
    loading:{
        display:'flex',
        height: 'var(--app-height)',
        justifyContent:'center',
        alignItems:'center'
    }
});

let socket;

function Chat({io, url, loggedIn, setLoggedIn}){
    const classes = useStyles();
    const history = useHistory();
    const {navData, navDispatch} = useContext(NavContext);
    const {chatData, chatDispatch} = useContext(ChatContext);
    const [loaded, setLoaded] = useState(false);

    const handleLogOut = () => {
        socket.emit('close_client', chatData.user._id);
        axios.get('/api/actions/logout', {withCredentials:true})
        .then(res => {
            if(res.data.loggedIn === false){
                setLoggedIn(res.data);
                socket.close();
                history.push('/');
            }
        })
        .catch((err) => console.log(err));
    };

    useEffect(()=>{
        const appHeight = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        window.addEventListener('resize', appHeight);
        appHeight();

        return () => window.removeEventListener('resize', appHeight);
    }, []);

    useEffect(() => {
        //redirect if user is not logged in
        if(!loggedIn){
            history.push('/');
        } else {
            //fetch current chat data from DB
            axios.get('/api/actions/data', {withCredentials:true})
            .then(res => {
                chatDispatch({type:'INIT', payload: res.data})
                setLoaded(true);
            }) 
        }
    }, [history, loggedIn, chatDispatch]);

    useEffect(() => {
        if(loaded){
            socket = new io(url);

            //listens for new messages from the backend and updates state
            socket.on('message', (room, message) => {
                message = JSON.parse(message);
                chatDispatch({type:'NEW_MSG', room:room, message:message})
            });

            //listener to update user status
            socket.on('update_status', (groupId, userId, status) => {
                chatDispatch({type:'UPDATE_STATUS', groupId: groupId, userId: userId, status:JSON.parse(status)});
            });

            //listener to update pending list
            socket.on('update_pendinglist', ()=> {
                axios.get('/api/users/pendinginvites', {withCredentials:true})
                .then(res => {
                    if(res.data.status === 1){
                        chatDispatch({type:'UPDATE_PENDING', payload:res.data.data}) 
                    }
                })
                .catch(err => console.log(err)); 
            });

            //listener to update member list
            socket.on('update_memberlist', (groupId) => {
                axios.get('/api/groups/'+ groupId + '/members', {withCredentials:true})
                .then(res => {
                    if(res.data.status === 1){
                        chatDispatch({type:'UPDATE_MEMBERS', groupId:groupId, payload:res.data.data}) ;
                    }
                })
                .catch(err => console.log(err)); 
            });

            //listener to update group data
            socket.on('update_group', (groupId, groupDescription) => {
                chatDispatch({type:'UPDATE_GROUP', groupId:groupId, groupDescription: groupDescription});
            });

            //listener to remove group
            socket.on('remove_group', (groupId) => {
                socket.emit('leave_room', groupId);
                chatDispatch({type:'REMOVE_GROUP', groupId:groupId});
            });

            //on connect joins the rooms on the client side
            socket.on('connect', () => {
                const userId = chatData.user._id;

                chatData.groups.forEach(group => {
                    socket.emit('join_room', group._id);
                    //emit to groups that user is online
                    socket.emit('update_status', group._id, userId, 'true');
                });

                socket.emit('user', chatData.user._id);
            });

            socket.on('close_client', ()=>{
                handleLogOut();
            });
        }

        //closes socket connection when component dismounts
        return () => {
            if(socket) socket.close();
        }
        //eslint-disable-next-line
    }, [loaded])

    const newMessage = (text) => {
        const message = {id: chatData.user._id, text: text, time: new Date()};
        socket.emit('message', chatData.selected._id, JSON.stringify(message));
        chatDispatch({type:'NEW_MSG', room:chatData.selected._id, message:message});
    }
    const joinRoom = (roomId) => {
        socket.emit('join_room', roomId)
    }
    const updateInvite = (userId) => {
        socket.emit('update_pendinglist', userId);
    }
    const updateMembers = (groupId) => {
        socket.emit('update_memberlist', groupId);
    }

    const updateGroup = (groupId, groupDescription) => {
        socket.emit('update_group', groupId, groupDescription)
    }

    const removeGroup = (groupId) => {
        socket.emit('remove_group', groupId);
    }

    const removeUsers = (userIds, groupId) => {
        socket.emit('remove_users', userIds, groupId);
    }

    const openNewGroup = () => {
        navDispatch({type:'NEWGROUP', open:true});
        navDispatch({type:'LEFTDRAWER', open: false});
    }

    const leaveRoom = (groupId) => {
        socket.emit('leave_room', groupId);
    }

    const currentGroup = chatData.groups[chatData.selected.index];

    const ChatDisplay = <><LeftNav userData={chatData.user} groupData={chatData.groups} joinRoom={joinRoom} updateMembers={updateMembers} />
                        {chatData.groups.length > 0 ? 
                            <ChatRoom currentGroup={currentGroup} userInfo={chatData.user}
                            newMessage={newMessage} updateMembers={updateMembers} selected={chatData.selected}
                            updateGroup={updateGroup} removeGroup={removeGroup} leaveRoom={leaveRoom} 
                            removeUsers={removeUsers} updateInvite={updateInvite} handleLogOut={handleLogOut} /> 
                        : <Welcome handleLogOut={handleLogOut} openNewGroup={openNewGroup} />}</>

    if(loaded){
        return(
            <div className={classes.root}>
                {navData.view === 'chat' ? ChatDisplay : <VideoConference socket={socket}  
                                                            channelId={chatData.selected._id} 
                                                            userId={chatData.user._id} 
                                                            groupName={currentGroup.groupName}/> }
            </div>
        );
    } else {
        return(
            <div className={classes.loading}>
                <CircularProgress />
            </div>
        )
    }
    
}

export default Chat