import Conversation from "../models/Conversation.js";

export const clearConversation = async () => {
  try {
    const listConversation = await Conversation.find();

    listConversation.forEach(async (conversation) => {
      const isHiddenAll = conversation.participants.every(
        (participant) => participant.hidden === true,
      );

      if (isHiddenAll) {
        await Conversation.findByIdAndDelete(conversation._id);
        console.log(`Deleted conversation with ID: ${conversation._id}`);
      }
    });
  } catch (error) {
    console.error("Error clearing conversations:", error);
  }
};
