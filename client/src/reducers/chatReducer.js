function reducer(state, action){
    switch(action.type){
        case "INIT":
            return action.payload;
        case "NEW_MSG":
            const newGroup = state.groups.map( group => {
                if(group._id === action.room ){
                    const newMessages = [...group.messages, action.message];
                    return {...group, messages:newMessages}
                } else {
                    return group;
                }
            });
            return {...state, groups:newGroup}
        case "CHANGE_GROUP":
            return {...state, selected: {_id: action.selected, name:action.name, type:'group'}}
        default:
            return state;
    }
}

export default reducer;