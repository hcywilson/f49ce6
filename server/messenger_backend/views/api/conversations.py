from django.contrib.auth.middleware import get_user
from django.db.models import Max, Q
from django.db.models.query import Prefetch
from django.http import HttpResponse, JsonResponse
from messenger_backend.models import Conversation, Message, message
from online_users import online_users
from rest_framework.views import APIView
from rest_framework.request import Request


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
                Conversation.objects.filter(
                    Q(user=user_id))
                .prefetch_related(
                    Prefetch(
                        "messages", queryset=Message.objects.order_by("createdAt")
                    )
                )
                .all()
            )

            conversations_response = []

            for convo in conversations:
                try:
                    lastMessgaeIdReadByRecipient = max(message.id for message in convo.messages.all(
                    ) if message.senderId == user_id and message.read)
                except ValueError:
                    lastMessgaeIdReadByRecipient = None

                convo_dict = {
                    "id": convo.id,
                    "messages": [
                        message.to_dict(
                            ["id", "text", "senderId", "createdAt"])
                        for message in convo.messages.all()
                    ],
                    "unreadMessages": sum(not message.read and not message.senderId == user_id for message in convo.messages.all()),
                    "lastMessgaeIdReadByRecipient": lastMessgaeIdReadByRecipient
                }
                # set properties for notification count and latest message preview
                convo_dict["latestMessageText"] = convo_dict["messages"][-1]["text"]

                # set a property "otherUser" so that frontend will have easier access
                user_fields = ["id", "username", "photoUrl"]
                for user in convo.user.all(): 
                    if user.id != user_id:
                        convo_dict["otherUser"] = user.to_dict(user_fields)

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

    def put(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)

            user_id = user.id
            body = request.data
            conversation_id = body.get("conversationId")
            last_read_message_id = body.get("lastReadMessageId")

            conversation = Conversation.objects.get(pk=conversation_id)

            if user_id in conversation.user.all():
                return HttpResponse(status=403)

            messages = Message.objects.filter(
                conversation=conversation_id, read=False, id__lte=last_read_message_id).exclude(senderId=user_id).all()
            for message in messages:
                message.read = True
            Message.objects.bulk_update(messages, ["read"])

            return HttpResponse(status=204)
        except Exception as e:
            return HttpResponse(status=500)
