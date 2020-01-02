import React, {useEffect, useState} from 'react';
import {useHistory} from 'react-router-dom';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';
import Groups from '../components/Groups';
import ChatRoom from '../components/ChatRoom';
import uuid from 'uuid/v4';
import axios from 'axios';
import './ChatPage.css';

let socket;
function Chat({username, loggedIn, setUserData}){
    const history = useHistory();
    const seedData = [
        {groupName: 'Group 1', messages:['Hello','this','is','group','1'], members: [], id: '_xy34'},
        {groupName: 'Group 2', messages:['Hello','this','is','group','2'], members: [], id: '_yy33'},
        {groupName: 'Group 3', messages:['Hello','this','is','group','3'], members: [], id: '_zz54'} 
    ];

    const [chatData, setChatData] = useState(seedData);
    const [selectedGroup, setSelectedGroup] = useState(chatData[0].id);
    
    useEffect(() => {
        //redirect if user is not logged in
        if(!loggedIn){
            history.push('/');
        } else {
            socket = io();
            //connects client to their groups
            socket.on('connect', () => {
                chatData.forEach(group => {
                    socket.emit('room', group.id)
                });
            })
            //listens for new messages from the backend and updates state
            socket.on('message', (room, message) => {
                setChatData( groups => groups.map( group => {
                    if(group.id === room ){
                        const newMessages = [...group.messages, message];
                        return {...group, messages:newMessages}
                    } else {
                        return group;
                    }
                }));
            });
            axios.get('/api/users/data', {withCredentials:true})
            .then(data => console.log(data));
        }
        // eslint-disable-next-line
    }, []);

    const newMessage = (message) => {
        socket.emit('message', selectedGroup, message);
        setChatData( groups => groups.map( group => {
            if(group.id === selectedGroup){
                const newMessages = [...group.messages, message];
                return {...group, messages:newMessages}
            } else {
                return group;
            }
        }));
    }

    const createNewGroup = (newGroupName, groupId) => {
        axios.post('/api/groups/new', {
            newGroupName:newGroupName,
            withCredentials:true
        }).then( res => {
            console.log(res);
            setChatData( groups => [...groups, {newGroupName: newGroupName, messages: [], members: [], id: groupId}]);
            socket.emit('room', groupId);
        })
        
    }

    const groups = chatData.map( group => {return {name:group.groupName, id:group.id}});
    
    const displayMessages = () => {
        for(let i = 0; i < chatData.length; i++){
            if(chatData[i].id === selectedGroup){
                return chatData[i].messages; 
            }
        }
    }

    //Closes all socket connections
    const closeSockets = () => {
        socket.close('chat message');
    }

    return(
        <div className='ChatPage'>
            <Navbar username={username} history={history} setUserData={setUserData} closeSockets={closeSockets} />
            <div className='flex-container'>
                <Groups groups={groups} setGroup={setSelectedGroup} createNewGroup={createNewGroup} />
                <ChatRoom messages={displayMessages()} newMessage={newMessage} key={uuid()} />
            </div>
        </div>
    );
}

export default Chat