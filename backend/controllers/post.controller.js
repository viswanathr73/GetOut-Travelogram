import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";

//add a new post------------------------------>

export const addNewPost = async (req, res) => {
    try {

        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if (!image || !image.buffer) return res.status(400).json({ message: 'Image is required' });

        //image upload
        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();
        //buffer ti data uri
        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`
        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });

        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }
        await post.populate({ path: 'author', select: '-password' });
        return res.status(201).json({ message: 'New post was created successfully', post, success: true });

    } catch (error) {
        console.error('Error in addNewPost:', error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });

    }
}

//get all posts of differnt users in home page------------------------------>

export const getAllPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Default: 10 posts per page

        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                options: { sort: { createdAt: -1 } },
                populate: { path: 'author', select: 'username profilePicture' }
            });

        return res.status(200).json({
            message: 'Posts fetched successfully',
            success: true,
            posts
        });

    } catch (error) {
        console.error('Error in getAllPosts:', error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

//get all posts of the user in the usrprofile----------------------->

export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 })
            .populate({
                path: 'author',
                select: 'username, profilePicture'
            }).populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: { path: 'author', select: 'username, profilePicture' }
            });
        return res.status(200).json({ message: 'posts fetched successfully', posts, success: true });

    } catch (error) {
        console.log('error in get user posts', error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

//like post ------------------------------------------------>

export const likePost = async (req, res) => {
    try {
        const likedUsersId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({ message: "Post not found", success: false });

        //like logic
        await post.updateOne({ $addToSet: { likes: likedUsersId } });
        await post.save();

        //implementing  socket io for real time notifications

        return res.status(200).json({ message: "Liked post successfully", success: true });
    } catch (error) {
        console.log('error in liking posts', error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }

}


//dislike a post-------------------------------------------------->

export const dislikePost = async (req, res) => {
    try {
        const likedUsersId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({ message: "Post not found", success: false });

        //dislike logic
        await post.updateOne({ $pull: { likes: likedUsersId } });
        await post.save();

        //dislike- Emit a notification event

        return res.status(200).json({ message: "Disliked post successfully", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }

}

//delete a post------------------------------------------------->
export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false })

        //check if the logged user is the author of the post
        if (post.author.toString() !== authorId) return res.status(403).json({ message: "Unauthorized author" })
        //delete post
        await Post.findByIdAndDelete(postId);
        //remove the postId from the user's post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() != postId);
        await user.save();

        //delete associated comments

        await Comment.deleteMany({ post: postId })
        return res.status(200).json({
            message: "Post deleted",
            success: true
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

//bookmark a post---------------------------------------------------->
export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({
            message: 'Post not found',
            success: false
        })

        const user = await User.findById(authorId);
        if (user.bookmarks.includes(post._id)) {
            //remove already bookmarked posts
            await user.updateOne({ $pull: { bookmarks: post._id } })
            await user.save();
            return res.status(200).json({
                type: "unsaved",
                message: 'Post removed from bookmark',
                success: true
            })
        } else {
            //do bookmark
            await user.updateOne({ $addToSet: { bookmarks: post._id } })
            await user.save();
            return res.status(200).json({
                type: "saved",
                message: 'Post bookmarked',
                success: true
            })

        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

//add comment in a post-------------------------------------------------->

export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const commentUserId = req.id;
        const { text } = req.body;
        const post = await Post.findById(postId);
        if (!text) return res.status(400).json({ message: "No comments found.", success: false });
        const comment = await Comment.create({
            text,
            author: commentUserId,
            post: postId
        })
        await comment.populate({
            path: "author",
            select: "username profilePicture"
        });
        post.comments.push(comment._id);
        await post.save();
        return res.status(201).json({ message: "Comment added", success: true })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}
// delete comment in a post------------------------------------>


// get the comments of a perticular post--------------------------->

export const getCommentOfPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const comments = await Comment.find({ post: postId }).populate('author', 'username profilePicture');
        if (!comments) return res.status(404).json({ message: "No comments found", success: false })

        return res.status(200).json({ success: true, comments });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

