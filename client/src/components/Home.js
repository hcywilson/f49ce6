import React, { useCallback, useEffect, useState, useContext, useMemo } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";
import { Grid, CssBaseline, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { SidebarContainer } from "../components/Sidebar";
import { ActiveChat } from "../components/ActiveChat";
import { SocketContext } from "../context/socket";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};
    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [] };
        newState.push(fakeConvo);
      }
    });
    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post("/api/messages", body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit("new-message", {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const sendReadMessage = useCallback((convo) => {
    socket.emit("read-message", {
      conversationId: convo.id,
      readUserId: user.id,
      lastReadMessageId: convo.messages[convo.messages.length - 1].id,
    });
  }, [user, socket]);

  const postMessage = async (body) => {
    try {
      const data = await saveMessage(body);
      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {
      setConversations((prev) => {
        const newConversations = [...prev];
        for (let i = 0; i < newConversations.length; i++) {
          const convo = newConversations[i];
          if (convo.otherUser.id === recipientId) {
            const newConvo = { ...convo };
            const newMessages = [...newConvo.messages];
            newMessages.push(message);
            newConvo.messages = newMessages;
            newConvo.latestMessageText = message.text;
            newConvo.id = message.conversationId;
            newConvo.unreadMessages = 0;
            newConversations[i] = newConvo;
          }
        };
        return newConversations
      });
    },
    [setConversations],
  );

  const addMessageToConversation = useCallback(
    (data) => {
      // if sender isn't null, that means the message needs to be put in a brand new convo
      const { message, sender = null } = data;
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
          unreadMessages: 1,
        };
        newConvo.latestMessageText = message.text;
        setConversations((prev) => {
          return [newConvo, ...prev];
        });
      }
      else {
        setConversations((prev) => {
          const newConversations = [...prev];
          for (let i = 0; i < newConversations.length; i++) {
            const convo = newConversations[i];
            if (convo.id === message.conversationId) {
              const newConvo = { ...convo };
              const newMessages = [...newConvo.messages];
              newMessages.push(message);
              newConvo.messages = newMessages;
              newConvo.latestMessageText = message.text;
              if (message.senderId !== user.id) { newConvo.unreadMessages++; }
              newConversations[i] = newConvo;
            }
          }
          return newConversations;
        });
      }
    },
    [setConversations, user],
  );

  const setActiveChat = (username) => {
    setActiveConversation(username);
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  const conversation = useMemo(() => conversations?.find(
    (conversation) => conversation.otherUser.username === activeConversation
  ), [conversations, activeConversation]);

  const putConversationAsRead = (convo) => {
    const body = {
      conversationId: convo.id,
      lastReadMessageId: convo.messages[convo.messages.length - 1].id
    };
    axios.put("/api/conversations", body);

  };

  const setUnreadMessageCountToZero = (convo) => {
    if (convo.unreadMessages > 0) {
      setConversations((prev) => {
        const newConversations = [...prev];
        for (let i = 0; i < newConversations.length; i++) {
          const c = newConversations[i];
          if (c.id === convo.id) {
            const newC = { ...c };
            newC.unreadMessages = 0;
            newConversations[i] = newC;
          }
        };
        return newConversations;
      });
    }
  };

  const updateSentMessageAsRead = useCallback((readMessage) => {
    setConversations((prev) => {
      const newConversations = [...prev];
      for (let i = 0; i < newConversations.length; i++) {
        const convo = newConversations[i];
        if (convo.id === readMessage.conversationId && user.id !== readMessage.readUserId) {
          const newConvo = { ...convo };
          newConvo.lastMessgaeIdReadByRecipient = readMessage.lastReadMessageId;
          newConversations[i] = newConvo;
        }
      };
      return newConversations;
    })
  }, [user])


  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on("add-online-user", addOnlineUser);
    socket.on("remove-offline-user", removeOfflineUser);
    socket.on("new-message", addMessageToConversation);
    socket.on("read-message", updateSentMessageAsRead);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off("add-online-user", addOnlineUser);
      socket.off("remove-offline-user", removeOfflineUser);
      socket.off("new-message", addMessageToConversation);
      socket.off("read-message", updateSentMessageAsRead);
    };
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, updateSentMessageAsRead, socket]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push("/login");
      else history.push("/register");
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get("/api/conversations");
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  useEffect(() => {
    if (conversation?.unreadMessages > 0) {
      putConversationAsRead(conversation);
      sendReadMessage(conversation);
      setUnreadMessageCountToZero(conversation);
    }
  }, [conversation, sendReadMessage]);

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
