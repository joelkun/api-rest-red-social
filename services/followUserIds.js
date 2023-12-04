const Follow = require("../models/follow");

const followUserIds = async (identityUserId) => {
  try {
    //Sacar info seguimiento
    let following = await Follow.find({ user: identityUserId })
      .select({ _id: 0, followed: 1 })
      .exec();

    let followers = await Follow.find({ followed: identityUserId })
      .select({ _id: 0, user: 1 })
      .exec();

    //Procesar array de identificadores
    let followingClean = [];
    following.forEach((follow) => {
      followingClean.push(follow.followed);
    });

    let followersClean = [];
    followers.forEach((follow) => {
      followersClean.push(follow.user);
    });

    return {
      following: followingClean,
      followers: followersClean,
    };
  } catch (error) {
    return {};
  }
};

const followThisUser = async (identityUserId, profileUserId) => {
  try {
    //Sacar info seguimiento
    let following = await Follow.findOne({
      user: identityUserId,
      followed: profileUserId,
    });

    let follower = await Follow.findOne({
      user: profileUserId,
      followed: identityUserId,
    });

    return {
      following,
      follower,
    };
  } catch (error) {
    return {};
  }
};

module.exports = {
  followUserIds,
  followThisUser,
};
