import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { getFriend } from "../utils/friendHelper.js";

export const sendFriendRequest = async (req, res) => {
  try {
    const { toUserId, message } = req.body;
    const fromUserId = req.user._id;

    //validate dữ liệu
    const userExists = await User.findById(toUserId);

    if (!userExists) {
      return res.status(404).json({ message: "User not exist" });
    }

    if (fromUserId.toString() === toUserId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send a friend request to yourself" });
    }

    let userA = fromUserId.toString();
    let userB = toUserId.toString();

    //đảm bảo userA luôn có id nhỏ hơn userB để tránh trùng lặp
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    //kiểm tra đã là bạn bè chưa
    const [alreadyFriends, existingRequest] = await Promise.all([
      Friend.findOne({ userA, userB }),
      FriendRequest.findOne({
        $or: [
          { fromUserId: fromUserId, toUserId: toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      }),
    ]);

    if (alreadyFriends) {
      return res.status(400).json({ message: "You are already friends" });
    }

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A friend request already exists between you two" });
    }

    //tạo yêu cầu kết bạn
    const request = await FriendRequest.create({
      fromUserId: fromUserId,
      toUserId: toUserId,
      message,
    });
    return res
      .status(201)
      .json({ message: "Friend request sent successfully", request });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    //tìm yêu cầu kết bạn
    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.toUserId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    //tạo mối quan hệ bạn bè
    await Friend.create({
      userA: request.fromUserId,
      userB: request.toUserId,
    });

    //xóa yêu cầu kết bạn
    await FriendRequest.findByIdAndDelete(requestId);

    //lấy thông tin người gửi để trả về
    const fromUser = await User.findById(request.fromUserId).select(
      "_id displayName avatarUrl",
    );
    return res.status(200).json({
      message: "Friend request accepted successfully",
      newFriend: {
        _id: fromUser?._id,
        displayName: fromUser?.displayName,
        avatarUrl: fromUser?.avatarUrl,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    console.log("Decline requestId:", requestId, "UserId:", userId);

    //tìm yêu cầu kết bạn
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    //chỉ người nhận mới có quyền từ chối
    if (request.toUserId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to decline this request" });
    }
    //xóa yêu cầu kết bạn
    await FriendRequest.findByIdAndDelete(requestId);
    return res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/*
  ===========Lấy danh sách bạn bè===========
  - kiểm tra xem có query displayName không, nếu có thì lọc danh sách bạn bè theo tên hiển thị
  - trả về danh sách bạn bè
 */
export const getAllFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const searchName = req.query.username || "";

    //tìm tất cả mối quan hệ với UserId
    const friendships = await Friend.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate("userA", "_id displayName")
      .populate("userB", "_id displayName")
      .lean();

    if (!friendships.length) {
      return res
        .status(200)
        .json({ message: "No friends available", friends: [] });
    }

    //trả danh sách bạn bè
    const friends = friendships.map((friendship) => {
      return getFriend(friendship.userA, friendship.userB, userId);
    });

    let friendListAfterSearch;
    if (searchName) {
      friendListAfterSearch = friends.filter((friend) => {
        return friend.displayName
          .toLowerCase()
          .includes(searchName.toLowerCase());
      });
    }

    return res
      .status(200)
      .json({ friends: searchName ? friendListAfterSearch : friends });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    //tìm tất cả yêu cầu kết bạn gửi đến UserId
    const requests = await FriendRequest.find({ toUserId: userId }).populate(
      "fromUserId",
      "_id displayName avatarUrl",
    );

    return res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
