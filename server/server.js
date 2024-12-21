import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccountKey from "./react-js-blog-web-729d4-firebase-adminsdk-3rymf-a474da93eb.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import aws from "aws-sdk";
import nodemailer from "nodemailer";

// schema below
import User from "./Schema/User.js";
import Blog from "./Schema/Blog.js";
import Notification from "./Schema/Notification.js";
import Comment from "./Schema/Comment.js";

const server = express();
let PORT = 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let nimRegex = /^213051\d{3}$/; // regex form nim
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
server.use(cors());

mongoose.connect(process.env.DB_LOCATION, {
  autoIndex: true,
});

const s3 = new aws.S3({
  region: "ap-southeast-2",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const generateUploadURL = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "blogging-mern-web",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(403).json({ error: "No access token" });
  }

  jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Access token is invalid" });
    }

    req.user = user.id;
    req.admin = user.admin;
    next();
  });
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const formatDatatoSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id, admin: user.admin },
    process.env.SECRET_ACCESS_KEY
  );

  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
    isAdmin: user.admin,
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];

  let usernameExists = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);

  usernameExists ? (username += nanoid().substring(0, 5)) : "";

  return username;
};

server.get("/get-upload-url", (req, res) => {
  generateUploadURL()
    .then((url) => res.status(200).json({ uploadURL: url }))
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/signup", (req, res) => {
  let { fullname, email, nim, password } = req.body;

  // Validasi data dari frontend
  if (fullname.length < 3) {
    return res
      .status(403)
      .json({ error: "Nama lengkap harus terdiri dari minimal 3 huruf" });
  }

  if (!email.length) {
    return res.status(403).json({ error: "Masukan Surel" });
  }

  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Surel tidak valid" });
  }

  if (!nim.length) {
    return res.status(403).json({ error: "Masukan NIM" });
  }

  if (!nimRegex.test(nim)) {
    return res.status(403).json({ error: "NIM tidak terdaftar" });
  }

  if (!passwordRegex.test(password)) {
    return res
      .status(403)
      .json({
        error:
          "Kata sandi harus terdiri dari 6 hingga 20 karakter dengan setidaknya satu angka, satu huruf kecil, dan satu huruf besar",
      });
  }

  // Cari apakah NIM sudah digunakan
  User.findOne({ "personal_info.nim": nim })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(403).json({ error: "NIM sudah terdaftar" });
      }

      // Hash password
      bcrypt.hash(password, 10, async (err, hashed_password) => {
        if (err) {
          return res.status(500).json({ error: "Error hashing password" });
        }

        // Generate username (contoh saja, sesuaikan dengan logika generate username Anda)
        let username = await generateUsername(email);

        // Buat objek user baru
        let user = new User({
          personal_info: {
            fullname,
            email,
            nim,
            password: hashed_password,
            username,
            isVerified: false,
          },
        });

        // Simpan user ke basis data
        // Simpan user ke basis data
        user
          .save()
          .then((u) => {
            // Generate email verification token
            const emailToken = nanoid();
            const verificationUrl = `http://localhost:5173/verify-email?token=${emailToken}`;

            // Send verification email
            const mailOptions = {
              from: process.env.EMAIL,
              to: email,
              subject: "Email Verification",
              text: `Click on the following link to verify your email: ${verificationUrl}`,
            };

            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                console.error("Error sending verification email:", err);
                return res
                  .status(500)
                  .json({ error: "Error sending verification email" });
              }
              console.log("Verification email sent:", info.response);
              return res
                .status(200)
                .json({
                  message: "Verification email sent. Please check your inbox.",
                });
            });
          })
          .catch((err) => {
            if (
              err.code == 11000 &&
              err.keyPattern &&
              err.keyPattern["personal_info.email"]
            ) {
              return res.status(500).json({ error: "Email sudah terdaftar" });
            }
            return res.status(500).json({ error: err.message });
          });
      });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/signin", (req, res) => {
  let { email, nim, password } = req.body;

  User.findOne({
    $and: [{ "personal_info.email": email }, { "personal_info.nim": nim }],
  })
    .then((user) => {
      if (!user) {
        return res
          .status(403)
          .json({ error: "Kombinasi Surel dan NIM tidak ditemukan" });
      }

      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res
              .status(403)
              .json({
                error: "Terjadi kesalahan saat login, silakan coba lagi",
              });
          }

          if (!result) {
            return res.status(403).json({ error: "Password Salah" });
          } else {
            return res.status(200).json(formatDatatoSend(user));
          }
        });
      } else {
        return res
          .status(403)
          .json({
            error:
              "Akun telah dibuat menggunakan Google. Cobalah masuk dengan Google",
          });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.get("/verify-email", (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: "Token tidak valid" });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res
        .status(400)
        .json({ error: "Token tidak valid atau kadaluarsa" });
    }

    const email = decoded.email;

    User.findOneAndUpdate(
      { "personal_info.email": email },
      { "personal_info.isVerified": true },
      { new: true }
    )
      .then((user) => {
        if (!user) {
          return res.status(404).json({ error: "User tidak ditemukan" });
        }
        return res.status(200).json(formatDatatoSend(user));
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  });
});

const allowedDomain = "@poljan.ac.id";

server.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;

  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      let { email, name, picture } = decodedUser;

      // Check if the email is from the allowed domain
      if (!email.endsWith(allowedDomain)) {
        return res
          .status(403)
          .json({ error: "Harus login menggunakan email poljan" });
      }

      picture = picture.replace("s96-c", "s384-c");

      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        .then((u) => {
          return u || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });

      if (user) {
        // login
        if (!user.google_auth) {
          return res
            .status(403)
            .json({
              error:
                "Email ini didaftarkan tanpa menggunakan Google. Silakan masuk tanpa google untuk mengakses akun",
            });
        }
      } else {
        // sign up

        let username = await generateUsername(email);

        user = new User({
          personal_info: { fullname: name, email, username },
          google_auth: true,
        });

        await user
          .save()
          .then((u) => {
            user = u;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }

      return res.status(200).json(formatDatatoSend(user));
    })
    .catch((err) => {
      return res
        .status(500)
        .json({ error: "Gagal mengautentikasi. Coba dengan akun Google lain" });
    });
});

server.post("/latest-blogs", (req, res) => {
  let { page } = req.body;

  let maxLimit = 5;

  Blog.find({ draft: false, active: true })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title desc banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/all-latest-blogs-count", (req, res) => {
  Blog.countDocuments({ draft: false, active: true })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.get("/trending-blogs", (req, res) => {
  Blog.find({ draft: false, active: true })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({
      "activity.total_read": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(200).json({ error: err.message });
    });
});

server.post("/search-blogs", (req, res) => {
  let { tag, query, author, page, limit, eliminate_blog } = req.body;

  let findQuery;

  if (tag) {
    findQuery = {
      tags: tag,
      draft: false,
      active: true,
      blog_id: { $ne: eliminate_blog },
    };
  } else if (query) {
    findQuery = { draft: false, active: true, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  let maxLimit = limit ? limit : 2;

  Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title desc banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/search-blogs-count", (req, res) => {
  let { tag, author, query } = req.body;

  let findQuery;

  if (tag) {
    findQuery = { tags: tag, draft: false, active: true };
  } else if (query) {
    findQuery = { draft: false, active: true, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  Blog.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/search-users", (req, res) => {
  let { query } = req.body;
  User.find({ "personal_info.username": new RegExp(query, "i") })
    .limit(50)
    .select(
      "personal_info.fullname personal_info.username personal_info.profile_img -_id"
    )
    .then((users) => {
      return res.status(200).json({ users });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-profile", (req, res) => {
  let { username } = req.body;

  User.findOne({ "personal_info.username": username })
    .select("-personal_info.password -google_auth -updateAt -blogs")
    .then((user) => {
      return res.status(200).json(user);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/update-profile-img", verifyJWT, (req, res) => {
  let { url } = req.body;

  User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url })
    .then(() => {
      return res.status(200).json({ profile_img: url });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/update-profile", verifyJWT, (req, res) => {
  let { username, bio, social_links } = req.body;

  let bioLimit = 150;

  if (username.length < 3) {
    return res
      .status(403)
      .json({ error: "Username should be at least 3 letters long" });
  }

  if (bio.length > bioLimit) {
    return res
      .status(403)
      .json({ error: `Bio should not be more than ${bioLimit} characters` });
  }

  let socialLinksArr = Object.keys(social_links);

  try {
    for (let i = 0; i < socialLinksArr.length; i++) {
      if (social_links[socialLinksArr[i]].length) {
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

        if (
          !hostname.includes(`${socialLinksArr[i]}.com`) &&
          socialLinksArr[i] != "website"
        ) {
          return res
            .status(403)
            .json({
              error: `Tautan ${socialLinksArr[i]} tidak valid. Harap masukkan tautan lengkap`,
            });
        }
      }
    }
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Harap sertakan tautan sosial lengkap dengan http(s)" });
  }

  let updateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links,
  };

  User.findOneAndUpdate({ _id: req.user }, updateObj, {
    runValidators: true,
  })
    .then(() => {
      return res.status(200).json({ username });
    })
    .catch((err) => {
      if (err.code == 11000) {
        return res.status(409).json({ error: "username sudah digunakan" });
      }
      return res.status(500).json({ error: err.message });
    });
});

server.post("/create-blog", verifyJWT, (req, res) => {
  let authorId = req.user;

  let { title, desc, banner, tags, content, draft, id } = req.body;

  if (!title.length) {
    return res
      .status(403)
      .json({ error: "You must provide a title to publish the blog" });
  }

  if (!draft) {
    if (!desc.length || desc.length > 200) {
      return res
        .status(403)
        .json({
          error: "You mus provide blog description under 200 charecters",
        });
    }

    if (!banner.length) {
      return res
        .status(403)
        .json({ error: "You must provide blog banner to publish it" });
    }

    if (!content.blocks.length) {
      return res
        .status(403)
        .json({ error: "There must be some blog content to publish it" });
    }

    if (!tags.length || tags.length > 10) {
      return res
        .status(403)
        .json({
          error: "Provide tags in order to publish the blog, Maximum 10",
        });
    }
  }

  tags = tags.map((tag) => tag.toLowerCase());

  let blog_id =
    id ||
    title
      .replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();

  if (id) {
    Blog.findOneAndUpdate(
      { blog_id },
      { title, desc, banner, content, tags, draft: draft ? draft : false }
    )
      .then(() => {
        return res.status(200).json({ id: blog_id });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } else {
    let blog = new Blog({
      title,
      desc,
      banner,
      content,
      tags,
      author: authorId,
      blog_id,
      draft: Boolean(draft),
    });

    blog
      .save()
      .then((blog) => {
        let incrementVal = draft ? 0 : 1;

        User.findOneAndUpdate(
          { _id: authorId },
          {
            $inc: { "account_info.total_posts": incrementVal },
            $push: { blogs: blog._id },
          }
        )
          .then((user) => {
            return res.status(200).json({ id: blog.blog_id });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ error: "Failed to update total posts number" });
          });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  }
});

server.post("/get-blog", (req, res) => {
  let { blog_id, draft, mode } = req.body;

  let incrementVal = mode != "edit" ? 1 : 0;

  Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_reads": incrementVal } }
  )
    .populate(
      "author",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .select("title desc content banner activity publishedAt blog_id tags")
    .then((blog) => {
      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        {
          $inc: { "account_info.total_reads": incrementVal },
        }
      ).catch((err) => {
        return res.status(500).json({ error: err.message });
      });

      if (blog.draft && !draft) {
        return res
          .status(500)
          .json({ error: "you can not access draft blogs" });
      }

      return res.status(200).json({ blog });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/like-blog", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id, isLikedByUser } = req.body;

  let incrementVal = !isLikedByUser ? 1 : -1;

  Blog.findOneAndUpdate(
    { _id },
    { $inc: { "activity.total_likes": incrementVal } }
  ).then((blog) => {
    if (!isLikedByUser) {
      let like = new Notification({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });

      like.save().then((notification) => {
        return res.status(200).json({ liked_by_user: true });
      });
    } else {
      Notification.findOneAndDelete({ user: user_id, blog: _id, type: "like" })
        .then((data) => {
          return res.status(200).json({ liked_by_user: false });
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });
    }
  });
});

server.post("/isliked-by-user", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id } = req.body;

  Notification.exists({ user: user_id, type: "like", blog: _id })
    .then((result) => {
      return res.status(200).json({ result });
    })
    .catch((err) => {
      return res.status(500).json({ error: err });
    });
});

server.post("/add-comment", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id, comment, blog_author, replying_to, notification_id } = req.body;

  if (!comment.length) {
    return res
      .status(403)
      .json({ error: "Write something to leave a comment" });
  }

  // creating a comment doc
  let commentObj = new Comment({
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  });

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  new Comment(commentObj).save().then(async (commentFile) => {
    let { comment, commentedAt, children } = commentFile;

    Blog.findOneAndUpdate(
      { _id },
      {
        $push: { comments: commentFile._id },
        $inc: {
          "activity.total_comments": 1,
          "activity.total_parent_comments": replying_to ? 0 : 1,
        },
      }
    ).then((blog) => {
      console.log("New comment created");
    });

    let notificationObj = {
      type: replying_to ? "reply" : "comment",
      blog: _id,
      notification_for: blog_author,
      user: user_id,
      comment: commentFile._id,
    };

    if (replying_to) {
      notificationObj.replied_on_comment = replying_to;

      await Comment.findOneAndUpdate(
        { _id: replying_to },
        { $push: { children: commentFile._id } }
      ).then((replyingToCommentDoc) => {
        notificationObj.notification_for = replyingToCommentDoc.commented_by;
      });

      if (notification_id) {
        Notification.findOneAndUpdate(
          { _id: notification_id },
          { reply: commentFile._id }
        ).then((notification) => console.log("notification updated"));
      }
    }

    new Notification(notificationObj)
      .save()
      .then((notification) => console.log("new notification created"));

    return res.status(200).json({
      comment,
      commentedAt,
      _id: commentFile,
      user_id,
      children,
    });
  });
});

server.post("/get-blog-comments", (req, res) => {
  let { blog_id, skip } = req.body;

  let maxLimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username personal_info.fullname personal_info.profile_img"
    )
    .skip(skip)
    .limit(maxLimit)
    .sort({
      commentedAt: -1,
    })
    .then((comment) => {
      return res.status(200).json(comment);
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-replies", (req, res) => {
  let { _id, skip } = req.body;

  let maxLimit = 5;

  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        select:
          "personal_info.profile_img personal_info.fullname personal_info.username",
      },
      select: "-blog_id -updatedAt",
    })
    .select("children")
    .then((doc) => {
      return res.status(200).json({ replies: doc.children });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

const deleteComments = (_id) => {
  Comment.findOneAndDelete({ _id })
    .then((comment) => {
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } }
        )
          .then((data) => console.log("Comment delete from parent"))
          .catch((err) => console.log(err));
      }

      Notification.findOneAndDelete({ comment: _id }).then((notification) =>
        console.log("comment notification deleted")
      );

      Notification.findOneAndUpdate(
        { reply: _id },
        { $unset: { reply: 1 } }
      ).then((notification) => console.log("Reply notification deleted"));

      Blog.findOneAndUpdate(
        { _id: comment.blog_id },
        {
          $pull: { comments: _id },
          $inc: { "activity.total_comments": -1 },
          "activity.total_parent_comments": comment.parent ? 0 : -1,
        }
      ).then((blog) => {
        if (comment.children.length) {
          comment.children.map((replies) => {
            deleteComments(replies);
          });
        }
      });
    })
    .catch((err) => {
      console.log(err.message);
    });
};

server.post("/delete-comment", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id } = req.body;

  Comment.findOne({ _id }).then((comment) => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
      deleteComments(_id);
      return res.status(200).json({ status: "done" });
    } else {
      return res.status(403).json({ error: "You can not delete this comment" });
    }
  });
});

server.post("/change-password", verifyJWT, (req, res) => {
  let { currentPassword, newPassword } = req.body;

  if (
    !passwordRegex.test(currentPassword) ||
    !passwordRegex.test(newPassword)
  ) {
    return res
      .status(403)
      .json({
        error:
          "Password should be 6 to 20 characters long with a numeric, 1 lowecase and 1 uppercase letters",
      });
  }

  User.findOne({ _id: req.user })
    .then((user) => {
      if (user.google_auth) {
        return res
          .status(403)
          .json({
            error:
              "Anda tidak dapat mengubah kata sandi akun karena Anda masuk melalui Google",
          });
      }

      bcrypt.compare(
        currentPassword,
        user.personal_info.password,
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({
                error:
                  "Some error occured while changing the password, please try again later",
              });
          }

          if (!result) {
            console.log("error password");
            return res
              .status(403)
              .json({ error: "Incorrect current password" });
          }

          bcrypt.hash(newPassword, 10, (err, hashed_password) => {
            User.findOneAndUpdate(
              { _id: req.user },
              { "personal_info.password": hashed_password }
            )
              .then((u) => {
                return res.status(200).json({ status: "Password changed" });
              })
              .catch((err) => {
                return res
                  .status(500)
                  .json({
                    error:
                      "Some error occured while saving new password, please try again later",
                  });
              });
          });
        }
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "User not found" });
    });
});

server.get("/new-notification", verifyJWT, (req, res) => {
  let user_id = req.user;

  Notification.exists({
    notification_for: user_id,
    seen: false,
    user: { $ne: user_id },
  })
    .then((result) => {
      if (result) {
        return res.status(200).json({ new_notification_available: true });
      } else {
        return res.status(200).json({ new_notification_available: false });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/notifications", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { page, filter, deletedDocCount } = req.body;

  let maxLimit = 10;

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  let skipDocs = (page - 1) * maxLimit;

  if (filter != "all") {
    findQuery.type = filter;
  }

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  Notification.find(findQuery)
    .skip(skipDocs)
    .limit(maxLimit)
    .populate("blog", "title blog_id")
    .populate(
      "user",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .populate("comment", "comment")
    .populate("replied_on_comment", "comment")
    .populate("reply", "comment")
    .sort({ createdAt: -1 })
    .select("createdAt type seen reply")
    .then((notifications) => {
      Notification.updateMany(findQuery, { seen: true })
        .skip()
        .limit(maxLimit)
        .then(() => console.log("notification seen"));

      return res.status(200).json({ notifications });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/all-notifications-count", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { filter } = req.body;

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  if (filter != "all") {
    findQuery.type = filter;
  }

  Notification.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/user-written-blogs", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { page, draft, query, deletedDocCount, active } = req.body;

  let maxLimit = 5;
  let skipDocs = (page - 1) * maxLimit;

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  Blog.find({ author: user_id, draft, active, title: new RegExp(query, "i") })
    .skip(skipDocs)
    .limit(maxLimit)
    .sort({ publishedAt: -1 })
    .select(
      "title banner publishedAt updatedAt blog_id activity desc draft -_id"
    )
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/user-written-blogs-count", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { draft, query, active } = req.body;

  Blog.countDocuments({
    author: user_id,
    draft,
    active,
    title: new RegExp(query, "i"),
  })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/delete-account", verifyJWT, async (req, res) => {
  let user_id = req.user;

  try {
    // Update all blogs authored by the suspended user
    await Blog.deleteMany({ author: user_id });

    // Delete all notifications for the suspended user
    await Notification.deleteMany({ notification_for: user_id });

    // Delete all comments authored by the suspended user
    await Comment.deleteMany({ blog_author: user_id });

    // Delete the user itself
    await User.findOneAndDelete({ _id: user_id });

    // Send success response
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

server.post("/all-written-blogs", verifyJWT, (req, res) => {
  let isAdmin = req.admin;

  if (isAdmin) {
    let { page, draft, query, deletedDocCount, active } = req.body;

    let maxLimit = 5;
    let skipDocs = (page - 1) * maxLimit;

    if (deletedDocCount) {
      skipDocs -= deletedDocCount;
    }

    Blog.find({ draft, active, title: new RegExp(query, "i") })
      .skip(skipDocs)
      .limit(maxLimit)
      .sort({
        "activity.total_likes": -1,
        "activity.total_reads": -1,
      })
      .select(
        "title banner publishedAt updatedAt blog_id activity desc draft -_id"
      )
      .populate("author", "personal_info.username personal_info.fullname")
      .then((blogs) => {
        return res.status(200).json({ blogs });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } else {
    return res.status(500).json({ error: "you don't have permission" });
  }
});

server.post("/all-written-blogs-count", verifyJWT, (req, res) => {
  let isAdmin = req.admin;

  if (isAdmin) {
    let { draft, query, active } = req.body;

    Blog.countDocuments({ draft, active, title: new RegExp(query, "i") })
      .then((count) => {
        return res.status(200).json({ totalDocs: count });
      })
      .catch((err) => {
        console.log(err.message);
        return res.status(500).json({ error: err.message });
      });
  } else {
    return res.status(500).json({ error: "You don't have permission" });
  }
});

server.post("/suspend-blog", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { blog_id, author, activity } = req.body;

  Blog.findOneAndUpdate(
    { blog_id },
    {
      $set: {
        active: false,
        updatedAt: new Date(),
        "activity.total_reads": 0,
        "activity.total_likes": 0,
        "activity.total_comments": 0,
        "activity.total_parent_comments": 0,
      },
    }
  )
    .then((blog) => {
      Notification.deleteMany({
        blog: blog._id,
        type: { $ne: "suspend" },
      }).then((data) => console.log("notifications deleted"));

      Comment.deleteMany({ blog_id: blog._id }).then((data) =>
        console.log("comments deleted")
      );

      User.findOneAndUpdate(
        { _id: author._id },
        {
          $pull: { blog: blog._id },
          $inc: {
            "account_info.total_posts": -1,
            "account_info.total_reads": -activity.total_reads,
          },
        }
      ).then((user) => console.log("Blog deleted"));

      let notification = new Notification({
        type: "suspend",
        blog: blog._id,
        notification_for: author._id,
        user: user_id,
      });

      notification.save();

      return res.status(200).json({ status: "done" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/suspend-user", verifyJWT, async (req, res) => {
  try {
    const { _id } = req.body;

    // Update user to suspend
    const user = await User.findOneAndUpdate(
      { _id },
      {
        $set: {
          suspend: true,
          updatedAt: new Date(),
          "account_info.total_reads": 0,
        },
      },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update all blogs authored by the suspended user
    await Blog.updateMany(
      { author: user._id },
      {
        $set: {
          active: false,
          "activity.total_reads": 0,
          "activity.total_likes": 0,
          "activity.total_comments": 0,
          "activity.total_parent_comments": 0,
        },
      }
    );

    // Delete all notifications for the suspended user
    await Notification.deleteMany({ notification_for: user._id });

    // Delete all comments authored by the suspended user
    await Comment.deleteMany({ blog_author: user._id });

    return res.status(200).json({ status: "done" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

server.post("/unsuspend-blog", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { blog_id, author, title } = req.body;

  Blog.findOneAndUpdate(
    { blog_id },
    {
      $set: {
        active: true,
        updatedAt: new Date(),
        "activity.total_reads": 0,
        "activity.total_likes": 0,
        "activity.total_comments": 0,
        "activity.total_parent_comments": 0,
      },
    }
  )
    .then((blog) => {
      Notification.deleteMany({
        blog: blog._id,
        type: { $ne: "unsuspend" },
      }).then((data) => console.log("notifications deleted"));

      Comment.deleteMany({ blog_id: blog._id }).then((data) =>
        console.log("comments deleted")
      );

      User.findOneAndUpdate(
        { _id: author._id },
        { $pull: { blog: blog._id }, $inc: { "account_info.total_posts": +1 } }
      ).then((user) => console.log("Blog deleted"));

      let notification = new Notification({
        type: "unsuspend",
        blog: blog._id,
        notification_for: author._id,
        user: user_id,
      });

      notification.save();

      return res.status(200).json({ status: "done" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/unsuspend-user", verifyJWT, async (req, res) => {
  try {
    const { _id } = req.body;

    // Update user to suspend
    const user = await User.findOneAndUpdate(
      { _id },
      {
        $set: {
          suspend: false,
          updatedAt: new Date(),
          "account_info.total_reads": 0,
        },
      },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update all blogs authored by the suspended user
    await Blog.updateMany(
      { author: user._id },
      {
        $set: {
          active: true,
          "activity.total_reads": 0,
          "activity.total_likes": 0,
          "activity.total_comments": 0,
          "activity.total_parent_comments": 0,
        },
      }
    );

    // Delete all notifications for the suspended user
    await Notification.deleteMany({ notification_for: user._id });

    // Delete all comments authored by the suspended user
    await Comment.deleteMany({ blog_author: user._id });

    return res.status(200).json({ status: "done" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

server.post("/delete-blog", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { blog_id } = req.body;

  Blog.findOneAndDelete({ blog_id })
    .then((blog) => {
      const postDecrement = blog.draft ? 0 : -1;

      Notification.deleteMany({ blog: blog._id }).then((data) =>
        console.log("notifications deleted")
      );

      Comment.deleteMany({ blog_id: blog._id }).then((data) =>
        console.log("comments deleted")
      );

      User.findOneAndUpdate(
        { _id: user_id },
        {
          $pull: { blog: blog._id },
          $inc: { "account_info.total_posts": postDecrement },
        }
      ).then((user) => console.log("Blog deleted"));
      return res.status(200).json({ status: "done" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/delete-blog-admin", verifyJWT, (req, res) => {
  let { blog_id, author } = req.body;

  Blog.findOneAndDelete({ blog_id })
    .then((blog) => {
      Notification.deleteMany({ blog: blog._id }).then((data) =>
        console.log("notifications deleted")
      );

      Comment.deleteMany({ blog_id: blog._id }).then((data) =>
        console.log("comments deleted")
      );

      User.findOneAndUpdate(
        { _id: author._id },
        { $pull: { blog: blog._id }, $inc: { "account_info.total_posts": -1 } }
      ).then((user) => console.log("Blog deleted"));
      return res.status(200).json({ status: "done" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/delete-user", verifyJWT, async (req, res) => {
  try {
    const { _id } = req.body;

    // Update user to suspend
    const user = await User.findOneAndDelete({ _id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update all blogs authored by the suspended user
    await Blog.deleteMany({ author: _id });

    // Delete all notifications for the suspended user
    await Notification.deleteMany({ notification_for: _id });

    // Delete all comments authored by the suspended user
    await Comment.deleteMany({ blog_author: _id });

    return res.status(200).json({ status: "done" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

server.post("/all-users", verifyJWT, (req, res) => {
  let isAdmin = req.admin;

  if (isAdmin) {
    let { page, admin, query, deletedDocCount, suspend } = req.body;

    let maxLimit = 5;
    let skipDocs = (page - 1) * maxLimit;

    if (deletedDocCount) {
      skipDocs -= deletedDocCount;
    }

    User.find({
      admin,
      suspend,
      "personal_info.username": new RegExp(query, "i"),
    })
      .skip(skipDocs)
      .limit(maxLimit)
      .sort({
        "account_info.total_posts": -1,
        "account_info.total_reads": -1,
      })
      .select("personal_info account_info joinedAt updatedAt _id")
      .then((users) => {
        return res.status(200).json({ users });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } else {
    return res.status(500).json({ error: "you don't have permission" });
  }
});

server.post("/all-users-count", verifyJWT, (req, res) => {
  let isAdmin = req.admin;

  if (isAdmin) {
    let { admin, query, suspend } = req.body;

    User.countDocuments({
      admin,
      suspend,
      "personal_info.username": new RegExp(query, "i"),
    })
      .then((count) => {
        return res.status(200).json({ totalDocs: count });
      })
      .catch((err) => {
        console.log(err.message);
        return res.status(500).json({ error: err.message });
      });
  } else {
    return res.status(500).json({ error: "You don't have permission" });
  }
});

// admin chart

server.get("/registrations-stats", verifyJWT, async (req, res) => {
  try {
    const registrationsPerDay = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 }, // Sort by date in descending order
      },
      {
        $limit: 10, // Limit to the last 10 days
      },
      {
        $sort: { _id: 1 }, // Sort by date in ascending order for the final output
      },
    ]);

    res.json(registrationsPerDay);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.get("/posts-stats", verifyJWT, async (req, res) => {
  try {
    const postsPerDay = await Blog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 }, // Sort by date in descending order
      },
      {
        $limit: 10, // Limit to the last 10 days
      },
      {
        $sort: { _id: 1 }, // Sort by date in ascending order for the final output
      },
    ]);

    res.json(postsPerDay);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.get("/posts-stats-user", verifyJWT, async (req, res) => {
  let user_id = req.user;
  try {
    const postsPerDay = await Blog.aggregate([
      {
        $match: {
          author: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 }, // Sort by date in descending order
      },
      {
        $limit: 10, // Limit to the last 10 days
      },
      {
        $sort: { _id: 1 }, // Sort by date in ascending order for the final output
      },
    ]);

    res.json(postsPerDay);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.get("/top-post-stats", verifyJWT, async (req, res) => {
  const user_id = req.user;

  try {
    const topBlogs = await Blog.aggregate([
      {
        $match: {
          author: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $sort: {
          "activity.total_reads": -1,
        },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          _id: 0,
          title: 1,
          "activity.total_reads": 1,
        },
      },
    ]);

    const formattedTopBlogs = topBlogs.map((blog) => ({
      title: blog.title,
      total_reads: blog.activity.total_reads,
    }));

    res.json(formattedTopBlogs);
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

server.get("/top-blogs-stats", verifyJWT, async (req, res) => {
  try {
    const topBlogs = await Blog.aggregate([
      {
        $addFields: {
          total_likes: {
            $add: ["$activity.total_likes", "$activity.total_comments"],
          },
        },
      },
      {
        $sort: {
          total_likes: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 0,
          title: 1,
          total_likes: 1,
        },
      },
    ]);

    res.json(topBlogs);
  } catch (error) {
    console.error(error);
  }
});

server.get("/top-user-by-posts-stats", verifyJWT, async (req, res) => {
  try {
    const topUsersByPosts = await User.aggregate([
      {
        $sort: {
          "account_info.total_posts": -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 0,
          username: "$personal_info.username",
          total_posts: "$account_info.total_posts",
        },
      },
    ]);

    res.json(topUsersByPosts);
  } catch (error) {
    console.error(error);
  }
});

// user chart

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
