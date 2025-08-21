import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "com.jsm.asabcorp",
  projectId: "6854922e0036a1e8dee6",
  storageId: "6854976e000db585d780",
  databaseId: "685494a1002f8417c2b2",
  userCollectionId: "685494cd001135a4d108",
  videoCollectionId: "685494f9001c3ccb2ba2",
  chatsCollectionId: "687b05170001d79853e1",
  messagesCollectionId: "687b06060030cdc17a80",
  groupsCollectionId: "687b0448001ac393a59e",
  chatReadsCollectionId: "687bc8b4003cd8c8935d", 
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const storage = new Storage(client)
export const avatars = new Avatars(client);
export const databases = new Databases(client);

// Register user
export async function createUser(email, password, username) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) throw Error;
    try {
      await signOut();
    } catch (sessionError) {
      // It's okay if there's no active session
      console.log("No active session to delete:", sessionError.message);
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
    console.log(avatarUrl, "Avatar URL");
    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email: email,
        username: username,
        avatar: avatarUrl,
      }
    );
    console.log("New user created:", newUser);
    return newUser;
  } catch (error) {
    console.log(error, "Error creating user");
    throw new Error(error);
  }
}

// Sign In
export async function signIn(email, password) {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    throw new Error(error);
  }
}

// Get Account
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    throw new Error(error);
  }
}

// Get Current User
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}

// Sign Out
export async function signOut() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    throw new Error(error);
  }
}

// Upload File
export async function uploadFile(file, type) {
  if (!file) {
    console.log("No file provided for upload");
    return null;
  }

  console.log("Uploading file:", {
    name: file.name,
    size: file.size,
    type: type,
    mimeType: file.mimeType
  });

  const { mimeType, ...rest } = file;
  const asset = { type: mimeType, ...rest };
  console.log(asset , 'asset')
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      asset
    );
    console.log(uploadedFile,"uploadedFile")
    console.log("File uploaded successfully:", uploadedFile.$id);

    if (type === 'image' || type === 'video') {
      const fileUrl = await getFilePreview(uploadedFile.$id, type);
      console.log("File URL generated:", fileUrl);
      return fileUrl;
    } else if (type === 'document' || type === 'audio') {
      // Return direct file view URL for documents and audio
      const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}`;
      console.log("Document/Audio file URL generated:", fileUrl);
      return fileUrl;
    } else {
      throw new Error('Unsupported file type for uploadFile');
    }
  } catch (error) {
    console.error("Error uploading file:", error.message);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

// Get File Preview
export async function getFilePreview(fileId, type) {
  try {
    console.log("Getting file preview for:", fileId, "type:", type);
    
    let fileUrl;

    if (type === "video") {
      // For videos, construct direct URL
      fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${fileId}/view?project=${appwriteConfig.projectId}`;
      console.log("Video URL generated:", fileUrl);
    } else if (type === "image") {
      // For images, construct preview URL
      fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${fileId}/preview?width=2000&height=2000&gravity=top&quality=100&project=${appwriteConfig.projectId}`;
      console.log("Image URL generated:", fileUrl);
    } else {
      throw new Error("Invalid file type");
    }

    if (!fileUrl) {
      console.log("No file URL generated");
      throw new Error("No file URL generated");
    }

    console.log("Final file URL:", fileUrl);
    return fileUrl;
  } catch (error) {
    console.error("Error in getFilePreview:", error);
    console.error("Error details:", {
      fileId,
      type,
      storageId: appwriteConfig.storageId,
      error: error.message
    });
    throw new Error(`Failed to get file preview: ${error.message}`);
  }
}


// Create Video Post
export async function createVideoPost(form) {
  try {
    console.log("Creating video post with form:", {
      title: form.title,
      prompt: form.prompt,
      userId: form.userId,
      hasThumbnail: !!form.thumbnail,
      hasVideo: !!form.video
    });

    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, "image"),
      uploadFile(form.video, "video"),
    ]);

    console.log("Uploaded URLs:", {
      thumbnailUrl,
      videoUrl
    });

    if (!thumbnailUrl || !videoUrl) {
      throw new Error("Failed to upload thumbnail or video");
    }

    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    console.log("Video post created successfully:", newPost.$id);
    return newPost;
  } catch (error) {
    console.error("Error creating video post:", error);
    throw new Error(`Failed to create video post: ${error.message}`);
  }
}

// Get all video Posts
export async function getAllPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId
    );

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get video posts created by user
export async function getUserPosts(userId) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.equal("creator", userId)]
    );

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get video posts that matches search query
export async function searchPosts(query) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.search("title", query)]
    );

    if (!posts) throw new Error("Something went wrong");

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get latest created video posts
export async function getLatestPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(7)]
    );

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Add bookmark
export async function addBookmark(userId, videoId, videoData) {
  try {
    const bookmark = await databases.createDocument(
      appwriteConfig.databaseId,
      "bookmarks", // You'll need to create this collection
      ID.unique(),
      {
        userId: userId,
        videoId: videoId,
        videoData: videoData,
        createdAt: new Date().toISOString(),
      }
    );

    console.log("Bookmark added successfully:", bookmark.$id);
    return bookmark;
  } catch (error) {
    console.error("Error adding bookmark:", error);
    throw new Error(`Failed to add bookmark: ${error.message}`);
  }
}

// Remove bookmark
export async function removeBookmark(bookmarkId) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      "bookmarks",
      bookmarkId
    );

    console.log("Bookmark removed successfully");
    return true;
  } catch (error) {
    console.error("Error removing bookmark:", error);
    throw new Error(`Failed to remove bookmark: ${error.message}`);
  }
}

// Get user bookmarks
export async function getUserBookmarks(userId) {
  try {
    const bookmarks = await databases.listDocuments(
      appwriteConfig.databaseId,
      "bookmarks",
      [Query.equal("userId", userId)]
    );

    return bookmarks.documents;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return [];
  }
}

// Check if video is bookmarked
export async function isVideoBookmarked(userId, videoId) {
  try {
    const bookmarks = await databases.listDocuments(
      appwriteConfig.databaseId,
      "bookmarks",
      [
        Query.equal("userId", userId),
        Query.equal("videoId", videoId)
      ]
    );

    return bookmarks.documents.length > 0;
  } catch (error) {
    console.error("Error checking bookmark status:", error);
    return false;
  }
}

// Update user profile (username and avatar)
export async function updateUserProfile(userId, newUsername, newAvatar) {
  try {
    // Update user document in the user collection
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        username: newUsername,
        avatar: newAvatar,
      }
    );
    console.log("User profile updated:", updatedUser);
    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update profile: " + error.message);
  }
}
