from django.contrib.auth.middleware import get_user
from django.db.models import Max, Q
from django.db.models.query import Prefetch
from django.http import HttpResponse, JsonResponse
from messenger_backend.models import Conversation, Message
from online_users import online_users
from rest_framework.views import APIView
from rest_framework.request import Request
import logging

logger = logging.getLogger(__name__)


class Conversations(APIView):
    """get all conversations for a user, include latest message text for preview, and all messages
    include other user model so we have info on username/profile pic (don't include current user info)
    TODO: for scalability, implement lazy loading"""

    def get(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)
            user_id = user.id

            conversations = (
                Conversation.objects.filter(Q(user1=user_id) | Q(user2=user_id))
                .prefetch_related(
                    Prefetch(
                        "messages", queryset=Message.objects.order_by("createdAt")
                    )
                )
                .all()
            )

            conversations_response = []

            for convo in conversations:
                convo_dict = {
                    "id": convo.id,
                    "messages": [
                        message.to_dict(["id", "text", "senderId", "createdAt"])
                        for message in convo.messages.all()
                    ],
                }

                # set properties for notification count and latest message preview
                convo_dict["latestMessageText"] = convo_dict["messages"][-1]["text"]

                # set a property "otherUser" so that frontend will have easier access
                user_fields = ["id", "username", "photoUrl"]
                if convo.user1 and convo.user1.id != user_id:
                    convo_dict["otherUser"] = convo.user1.to_dict(user_fields)
                    convo_dict["lastReadMessageId"] = convo.user2ReadMessageId
                elif convo.user2 and convo.user2.id != user_id:
                    convo_dict["otherUser"] = convo.user2.to_dict(user_fields)
                    convo_dict["lastReadMessageId"] = convo.user1ReadMessageId


                # set property for online status of the other user
                if convo_dict["otherUser"]["id"] in online_users:
                    convo_dict["otherUser"]["online"] = True
                else:
                    convo_dict["otherUser"]["online"] = False

                conversations_response.append(convo_dict)
            conversations_response.sort(
                key=lambda convo: convo["messages"][-1]["createdAt"],
                reverse=True,
            )
            return JsonResponse(
                conversations_response,
                safe=False,
            )
        except Exception as e:
            return HttpResponse(status=500)


    def post(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)

            user_id = user.id
            body = request.data
            conversation_id = body.get("conversationId")
            lastReadMessageId = body.get("lastReadMessageId")
            user_id = user.id

            convo = Conversation.objects.get(pk=conversation_id)
            if convo.user1.id == user_id and (convo.user1ReadMessageId is None or convo.user1ReadMessageId < lastReadMessageId):
                print("update user1ReadMessageId to ", lastReadMessageId)
                convo.user1ReadMessageId = lastReadMessageId
            elif convo.user2.id == user_id and (convo.user2ReadMessageId is None or convo.user2ReadMessageId < lastReadMessageId):
                print("update user1ReadMessageId to ", lastReadMessageId)
                convo.user2ReadMessageId = lastReadMessageId
            convo.save()     

            convo_dict = {
                    "conversationId": convo.id,
                }

            if convo.user1 and convo.user1.id != user_id:
                convo_dict["lastReadMessageId"] = convo.user2ReadMessageId
            elif convo.user2 and convo.user2.id != user_id:
                convo_dict["lastReadMessageId"] = convo.user1ReadMessageId

                # set properties for notification count and latest message preview
            
            return JsonResponse(
                convo_dict,
                safe=False,
            )       
        except Exception as e:
            return HttpResponse(status=500)
