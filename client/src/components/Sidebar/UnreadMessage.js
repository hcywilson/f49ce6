import React, { useState, useEffect } from "react";
import { makeStyles } from '@material-ui/core/styles';
import { Box, Typography } from '@material-ui/core';



const useStyles = makeStyles((theme) => ({
    bubble: {
        display: 'flex',
        minWidth: '25px',
        height: '25px',
        borderRadius: '50%',
        backgroundColor: "#3A8DFF",
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        display: 'flex',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: -0.2,
        padding: 8,
    },
}));

const UnreadMessage = ({ conversation }) => {
    const classes = useStyles();

    const [unreadMessage, setUnreadMessage] = useState(0);

    const updateUnreadMessage = (conversation) => {
        setUnreadMessage(
            conversation?.messages?.filter(
                message => (!conversation.lastReadMessageId || message.id > conversation.lastReadMessageId)
                    && message.senderId === conversation.otherUser.id).length
        );
    };

    useEffect(() => {
        updateUnreadMessage(conversation);
    }, [conversation]);

    if (unreadMessage > 0)
        return (
            <Box className={classes.bubble}>
                <Typography className={classes.text} >{unreadMessage}</Typography>
            </Box>)
    else
        return null;
};

export default UnreadMessage;