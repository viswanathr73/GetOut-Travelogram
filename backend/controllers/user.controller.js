import { User } from "../models/user.model.js";
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import {Post} from '../models/post.model.js';




//user registration------------------------------------------------------------->

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        //condition for checking the values entered by the user        
        if (!username || !email || !password) {
            return res.status(401).json({ message: "someting missing,please check!", sucess: false });
        }
        //for checking the mail id       
        const user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: "email already exists", sucess: false });
        };
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword
        });
        return res.status(200).json({ message: "Account created successfully", sucess: true });

    } catch (error) {
        console.log('error in user registration');

    }

}


// user login----------------------------------------------------------->

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({ message: "someting missing,please check!", sucess: false });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "user not found", sucess: false });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "invalid credentials", sucess: false });
        }


        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        //populate each post if in the post array
        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if (post.author.equals(user._id)) {
                    return post;
                }
                return null;
            })
        )

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            gender: user.gender,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        }


      return res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`, success: true, user
        });


    } catch (error) {
        console.log(error in user - login);

    }
}


//user logout--------------------------------------------------------->

export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log('error in logout');
    }
};

//to get the profile of the user-------------------------------->

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).select('-password');
        return res.status(200).json({ user, success: true });

    } catch (error) {
        console.log('error in getProfile');

    }
}

//edit profile------------------------------------------------------>

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;   //this will get from the auth middleware
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);

        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        };
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();
        return res.status(200).json({ message: 'Profile updated successfully', success: true, user });

    } catch (error) {
        console.log(error in editProfile);

    }
};

//get suggested users list--------------------------------------------------------------------->

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(404).json({ message: 'No suggested users found', success: false });
        };
        return res.status(200).json({ success: true, users: suggestedUsers });

    } catch (error) {
        console.log(error in getSuggestedUsers);

    }
};

//follow & unfollow user--------------------------------------------------------------------->

// export const followOrUnfollow = async (req, res) => {
//     try {
//         const WhoFollows = req.id;
//         const WhomIIntendToFollow = req.params.id;
//         if (WhoFollows === WhomIIntendToFollow) {
//             return res.status(400).json({ message: 'You cannot follow yourself', success: false });
//         }
//         const user = await User.findById(WhoFollows);
//         const targetUser = await User.findById(WhomIIntendToFollow);

//         if (!User || !targetUser) {
//             return res.status(404).json({ message: 'User not found', success: false });
//         }
//         const isFollowing = User.following.includes(WhomIIntendToFollow);
//         if (isFollowing) {
//             //unfollow logic
//             await Promise.all([
//                 User.updateOne({ _id: WhoFollows }, { $pull: { following: WhomIIntendToFollow } }),
//                 User.updateOne({ _id: WhomIIntendToFollow }, { $pull: { followers: WhoFollows } }),
//             ])
//             return res.status(200).json({ message: 'Unfollowed Successfully', success: true });
//         } else {
//             //follow logic
//             await Promise.all([
//                 User.updateOne({ _id: WhoFollows }, { $push: { following: WhomIIntendToFollow } }),
//                 User.updateOne({ _id: WhomIIntendToFollow }, { $push: { followers: WhoFollows } }),
//             ])

//         }


//     } catch (error) {
//         console.log(error);
//     }
// };

export const followOrUnfollow = async (req, res) => {
    try {
        const WhoFollows = req.id; // ID of the user who is following
        const WhomIIntendToFollow = req.params.id; // ID of the user to be followed

        if (WhoFollows === WhomIIntendToFollow) {
            return res.status(400).json({ message: 'You cannot follow yourself', success: false });
        }

        const user = await User.findById(WhoFollows); // User who is following
        const targetUser = await User.findById(WhomIIntendToFollow); // User to be followed

        if (!user || !targetUser) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const isFollowing = user.following.includes(WhomIIntendToFollow); // Check if already following

        if (isFollowing) {
            // Unfollow logic
            await Promise.all([
                User.updateOne({ _id: WhoFollows }, { $pull: { following: WhomIIntendToFollow } }),
                User.updateOne({ _id: WhomIIntendToFollow }, { $pull: { followers: WhoFollows } }),
            ]);
            return res.status(200).json({ message: 'Unfollowed Successfully', success: true });
        } else {
            // Follow logic
            await Promise.all([
                User.updateOne({ _id: WhoFollows }, { $push: { following: WhomIIntendToFollow } }),
                User.updateOne({ _id: WhomIIntendToFollow }, { $push: { followers: WhoFollows } }),
            ]);
            return res.status(200).json({ message: 'Followed Successfully', success: true });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error', success: false });
    }
};
