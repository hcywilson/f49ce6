import React, { memo } from "react";
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

const UnreadMessage = ({ unreadMessages }) => {
    const classes = useStyles();
    if (!unreadMessages || unreadMessages <= 0) return null;
    return (
        <Box className={classes.bubble}>
            <Typography className={classes.text} >{unreadMessages}</Typography>
        </Box>)
};

export default memo(UnreadMessage);