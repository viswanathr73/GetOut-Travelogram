import { Message } from '../models/message.model.js'
import { User } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";


// Send message ------------------------------------------------------->

export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const { textMessage: message } = req.body;

        console.log("Sender ID:", senderId);
        console.log("Receiver ID:", receiverId);


        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        //establish the conversation if not yet started
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId]
            }).populate({
                path: "messages",
                select: "senderId receiverId message createdAt",
            });
        };

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message
        })
        if (newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save(), newMessage.save()])


        // Implement socket io for real time data transfer



        return res.status(201).json({
            success: true,
            newMessage
        })
    } catch (error) {
        console.log(error);

    }
}


//get messages---------------------------------------------------->

export const getMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;

        console.log("Sender ID:", senderId);
        console.log("Receiver ID:", receiverId);


        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        }).populate('messages');
        if (!conversation) return res.status(200).json({ messages: [], success: true })
        return res.status(200).json({ success: true, messages: conversation?.messages })
    } catch (error) {
        console.log(error);
    }

}