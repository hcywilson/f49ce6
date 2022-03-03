import React from 'react';
import { Box } from '@material-ui/core';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';
import SenderBubbleWithRead from './SenderBubbleWithRead';

const Messages = (props) => {
  const { messages, otherUser, userId, lastReadMessageId } = props;
  return (
    <Box>
      {messages.map((message) => {
        const time = moment(message.createdAt).format('h:mm');

        return message.senderId === userId ?
          lastReadMessageId === message.id ? (
            <SenderBubbleWithRead
              key={message.id} text={message.text} time={time} otherUser={otherUser} />
          ) :
            (
              <SenderBubble key={message.id} text={message.text} time={time} />
            ) : (
            <OtherUserBubble
              key={message.id}
              text={message.text}
              time={time}
              otherUser={otherUser}
            />
          );
      })}
    </Box>
  );
};

export default Messages;
