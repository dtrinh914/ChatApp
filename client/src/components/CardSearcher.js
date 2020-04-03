import React, {useState, useRef, useEffect} from 'react';
import SearchIcon from '@material-ui/icons/Search';
import Input from '@material-ui/core/Input';
import List from '@material-ui/core/List';
import {makeStyles} from '@material-ui/styles';
import {throttle, debounce} from 'throttle-debounce';
import axios from 'axios'

const useStyle = makeStyles({
    search:{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#5c6bc0',
        borderRadius: '5px',
        height: '40px',
        width: '200px'
    },
    icon:{
        marginLeft: '10px',
        color:'white'
    },
    input:{
        color: 'white'
    },
    results:{
        backgroundColor: '#5c6bc0',
        borderRadius: '0 0 5px 5px',
        position:'absolute',
        width: '200px'
    },
    list:{
        padding: 0
    }
});

export default function CardSearcher() {
    const classes = useStyle();
    const valueRef = useRef('');
    const [value, setValue] = useState();
    const [acData, setACData] = useState([]);
    const [image, setImage]= useState('');
    const [selected, setSelected] = useState(0);

    useEffect(()=>{
        valueRef.current = value
    })

    //get card image
    const getCard = async () => {
        const query = acData[selected];
        const url = 'https://api.scryfall.com/cards/named?exact=' + query;
        try{
            const response = await axios.get(url);
        
            if(response.status === 200){
                const data = await response.data;
                setImage(data.image_uris.normal)
            }
        } catch(e){
            console.log(e);
        }
    }
    const getCardDebounced = debounce(500, getCard);


    //get autocomplete data
    const autoComplete = async() =>{
        const query = value;
        const url = 'https://api.scryfall.com/cards/autocomplete?q='+query
        try{
            const response = await axios.get(url)
                setSelected(0);
                if(response.status === 200 && query === value){
                const data = await response.data;
                setACData(data.data)
            }
        } catch(e){
            console.log(e);
        }
    }
  
    const autoCompleteThrottled = throttle(500, autoComplete);
    const autoCompleteDebounced = debounce(500, autoComplete);

    const handleChange = (e) => {
        const newVal = e.target.value;
        setValue(newVal);

        //check if the trimmed value of the new input and 
        // old input are different
        if(value && newVal.trim() !== value.trim()){
            if(newVal.length < 5){
                autoCompleteThrottled();
            } else {
                autoCompleteDebounced();
            }
        }
    }

    const handleSubmit = async (e) =>{
        e.preventDefault();
        //reset the values on submit
        if(acData.length > 0){
            getCardDebounced();
            setValue('');
            setACData([]);
        } 
    }

    const handleKeyDown = (e) =>{
        //on down arrow
        if(e.keyCode === 40){
        e.preventDefault();
        //scroll down 
            if(selected < acData.length){
                setSelected(selected + 1);
        //go to the topmost element
            } else{
                setSelected(0);
            }     
        }

        //on up arrow
        if(e.keyCode === 38){
        e.preventDefault();
        //scroll up
            if(selected > 0){
                setSelected(selected - 1)
            } else {
        //go to the bottommost element
                setSelected(acData.length -1);
            }
        }
    }
    return (
        <form onSubmit={handleSubmit}>
            <div className={classes.search}>
                <SearchIcon className={classes.icon} />
                <Input className={classes.input} disableUnderline 
                       placeholder='Card Search' onKeyDown={handleKeyDown}
                       onChange={handleChange} />
            </div>
            <div className={classes.results}>
                <List className={classes.list}>
                </List>
            </div>
        </form>
    )
}
